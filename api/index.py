from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field, validator
from typing import List, Optional, Literal
import httpx
import json
import uuid
import time
import re
import os
import logging
import tempfile
from datetime import datetime
from fastapi.middleware.cors import CORSMiddleware

# Setup Logging - Move log file to OS TEMP directory to COMPLETELY bypass project file-watchers
LOG_FILE = os.path.join(tempfile.gettempdir(), "techdesk_system_v2.log")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(LOG_FILE),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("TechDesk")
logger.info(f"Logging initialized. Log file located at: {LOG_FILE}")

app = FastAPI(title="TechDesk AI-Powered RCFA System")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434/api/generate")
MODEL_NAME = os.getenv("MODEL_NAME", "techdesk-model")
# Get current directory to locate expected_output.json
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
EXPECTED_OUTPUT_FILE = os.path.join(CURRENT_DIR, "expected_output.json")

# Models
class RCFAOutput(BaseModel):
    failure_category: Literal["Maintenance", "Electrical", "Mechanical", "IT Infrastructure", "Process"]
    root_cause: str
    action_plan: str
    latency: Optional[float] = None

class AnalysisRequest(BaseModel):
    failure_description: str

class HistoryEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: datetime = Field(default_factory=datetime.now)
    input_description: str
    ai_output: Optional[RCFAOutput] = None
    latency: float = 0.0
    error: Optional[str] = None
    debug_logs: Optional[str] = None # Capture raw AI response and prompt

class BenchmarkingResult(BaseModel):
    description: str
    expected_category: str
    ai_category: str
    is_match: bool
    latency: float

class BenchmarkingReport(BaseModel):
    total_cases: int
    total_matches: int
    accuracy_score: float
    average_latency: float
    results: List[BenchmarkingResult]

# In-memory history
history: List[HistoryEntry] = []

def clean_json_response(text: str) -> dict:
    """Extracts JSON block from AI response and parses it with robust cleaning."""
    logger.info(f"Ollama Raw Response Text: {text}")
    
    try:
        # 1. Try to find content between { and }
        match = re.search(r'(\{.*\})', text, re.DOTALL)
        if match:
            json_str = match.group(1)
            # Basic cleanup: remove common markdown artifacts if present
            json_str = json_str.replace('```json', '').replace('```', '')
            try:
                return json.loads(json_str)
            except json.JSONDecodeError:
                # If direct parse fails, try more aggressive cleaning (e.g., fixing quotes)
                json_str = json_str.replace("'", '"')
                return json.loads(json_str)
        
        # 2. Fallback: Try parsing the raw text directly after stripping whitespace
        return json.loads(text.strip())
        
    except (json.JSONDecodeError, AttributeError) as e:
        logger.error(f"JSON Parsing Failed: {str(e)}")
        raise ValueError(f"Failed to extract or parse JSON from AI response. Raw text: {text[:100]}...")

async def call_ollama(prompt: str) -> tuple[dict, float, str]:
    """Calls Ollama API and returns the parsed JSON, latency, and raw text."""
    start_time = time.time()
    payload = {
        "model": MODEL_NAME,
        "prompt": prompt,
        "stream": False
    }
    
    logger.info(f"Ollama Request Payload: {json.dumps(payload)}")
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(OLLAMA_URL, json=payload, timeout=30.0)
            response.raise_for_status()
            result = response.json()
            ai_text = result.get("response", "").strip()
            
            latency = time.time() - start_time
            logger.info(f"Ollama Call Succeeded. Latency: {latency:.2f}s")
            
            parsed_data = clean_json_response(ai_text)
            return parsed_data, latency, ai_text
            
    except httpx.ConnectError:
        logger.error("Ollama connection error - service may not be running")
        raise HTTPException(status_code=503, detail="Ollama service is not running")
    except httpx.HTTPError as e:
        logger.error(f"Ollama HTTP error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Ollama API error: {str(e)}")
    except Exception as e:
        logger.error(f"Inference error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"AI inference error: {str(e)}")

@app.get("/")
async def root():
    return {"status": "TechDesk API is running", "version": "1.0.0"}

@app.get("/health/ollama")
async def check_ollama_health():
    """Checks if the Ollama server is reachable."""
    try:
        async with httpx.AsyncClient() as client:
            # We check the base URL or tags to see if it's alive
            response = await client.get(OLLAMA_URL.replace("/api/generate", "/api/tags"), timeout=2.0)
            if response.status_code == 200:
                return {"status": "connected"}
            return {"status": "disconnected", "reason": f"Ollama returned {response.status_code}"}
    except Exception as e:
        return {"status": "disconnected", "reason": str(e)}

@app.post("/analyze", response_model=RCFAOutput)
async def analyze_failure(request: AnalysisRequest):
    prompt = f"Failure Description: {request.failure_description}"
    try:
        data, latency, raw_text = await call_ollama(prompt)
        
        # Add latency to response
        data["latency"] = round(latency, 2)
        
        # Validate using Pydantic
        output = RCFAOutput(**data)
        
        # Record history
        history.append(HistoryEntry(
            input_description=request.failure_description,
            ai_output=output,
            latency=round(latency, 2),
            debug_logs=f"PROMPT:\n{prompt}\n\nRAW RESPONSE:\n{raw_text}"
        ))
        
        return output
        
    except (ValueError, HTTPException) as e:
        error_msg = str(e.detail) if hasattr(e, 'detail') else str(e)
        history.append(HistoryEntry(
            input_description=request.failure_description,
            error=error_msg,
            debug_logs=f"PROMPT:\n{prompt}\n\nERROR:\n{error_msg}"
        ))
        raise e if isinstance(e, HTTPException) else HTTPException(status_code=500, detail=error_msg)

@app.get("/history", response_model=List[HistoryEntry])
async def get_history():
    return history

@app.get("/logs")
async def get_logs():
    """Returns the last 100 lines of the system log from the external location."""
    if not os.path.exists(LOG_FILE):
        return {"logs": f"Log file not found at {LOG_FILE}"}
    
    try:
        with open(LOG_FILE, "r") as f:
            lines = f.readlines()
            return {"logs": "".join(lines[-100:])}
    except Exception as e:
        return {"logs": f"Error reading logs: {str(e)}"}

@app.get("/benchmark", response_model=BenchmarkingReport)
async def run_benchmark():
    if not os.path.exists(EXPECTED_OUTPUT_FILE):
        raise HTTPException(status_code=404, detail="Benchmarking data file not found")
        
    with open(EXPECTED_OUTPUT_FILE, 'r') as f:
        benchmark_data = json.load(f)
        
    results = []
    total_matches = 0
    total_latency = 0.0
    
    for case in benchmark_data:
        desc = case["failure_description"]
        expected = case["expected_output"]
        prompt = f"Failure Description: {desc}"
        
        try:
            data, latency, raw_text = await call_ollama(prompt)
            ai_category = data.get("failure_category", "Unknown")
            is_match = ai_category == expected["failure_category"]
            
            if is_match:
                total_matches += 1
            
            total_latency += latency
            
            results.append(BenchmarkingResult(
                description=desc,
                expected_category=expected["failure_category"],
                ai_category=ai_category,
                is_match=is_match,
                latency=round(latency, 2)
            ))
        except Exception:
            results.append(BenchmarkingResult(
                description=desc,
                expected_category=expected["failure_category"],
                ai_category="Error",
                is_match=False,
                latency=0.0
            ))
            
    total_cases = len(benchmark_data)
    accuracy = (total_matches / total_cases) if total_cases > 0 else 0
    avg_latency = (total_latency / total_cases) if total_cases > 0 else 0
    
    return BenchmarkingReport(
        total_cases=total_cases,
        total_matches=total_matches,
        accuracy_score=round(accuracy, 2),
        average_latency=round(avg_latency, 2),
        results=results
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
