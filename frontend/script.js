const API_BASE_URL = 'http://localhost:8080';
const APP_VERSION = '1.0.5';

console.log(`TechDesk Industrial v${APP_VERSION} Initialized: ${new Date().toLocaleTimeString()}`);

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

let isAnalyzing = false;
let currentOutputData = null;

// Dynamic Ollama Status Checker
async function updateOllamaStatus() {
    const badge = document.getElementById('ollamaStatusBadge');
    const dot = document.getElementById('ollamaStatusDot');
    const text = document.getElementById('ollamaStatusText');

    if (!badge || !dot || !text) return;

    try {
        const response = await fetch(`${API_BASE_URL}/health/ollama`);
        const data = await response.json();

        if (data.status === 'connected') {
            text.textContent = 'Ollama: Connected';
            // Update styles for connected state
            badge.className = 'flex items-center text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-100 transition-all duration-500';
            dot.className = 'w-2 h-2 bg-green-500 rounded-full mr-2';
        } else {
            throw new Error('Disconnected');
        }
    } catch (error) {
        text.textContent = 'Ollama: Disconnected';
        // Update styles for disconnected state
        badge.className = 'flex items-center text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-full border border-red-100 transition-all duration-500';
        dot.className = 'w-2 h-2 bg-red-500 rounded-full mr-2';
    }
}

// Initial status check and periodic polling
updateOllamaStatus();
setInterval(updateOllamaStatus, 5000); // Check every 10 seconds

// Page Navigation with Industrial UI updates
function showPage(pageId) {
    console.log(`Switching to page: ${pageId}`);
    
    // Update sidebar active state
    const navItems = document.querySelectorAll('aside nav button');
    navItems.forEach(item => {
        item.classList.remove('sidebar-item-active');
        if (item.id === `nav-${pageId}`) item.classList.add('sidebar-item-active');
    });

    // Update Header Title
    const titleMap = {
        'dashboard': 'System Analysis Dashboard',
        'history': 'Diagnostic History Log',
        'benchmark': 'Model Performance Benchmarking',
        'logs': 'System Telemetry & Logs'
    };
    document.getElementById('pageTitle').textContent = titleMap[pageId] || 'TechDesk System';

    // Switch page visibility
    const pages = document.querySelectorAll('.page-content');
    pages.forEach(page => page.classList.add('hidden'));
    
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.remove('hidden');
        targetPage.classList.add('page-transition');
    }
    
    if (pageId === 'history') {
        fetchHistory();
    } else if (pageId === 'logs') {
        fetchLogs();
    }
}

// Button Pulse Animation
function handleInputPulse() {
    const desc = document.getElementById('failureDescription').value.trim();
    const btn = document.getElementById('analyzeBtn');
    if (desc.length > 10) {
        btn.classList.add('btn-pulse');
    } else {
        btn.classList.remove('btn-pulse');
    }
}

async function analyzeFailure(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    if (isAnalyzing) return;

    const failureDescription = document.getElementById('failureDescription').value.trim();
    if (!failureDescription) {
        alert('Please enter a failure description.');
        return;
    }

    const analyzeBtn = document.getElementById('analyzeBtn');
    const analyzeBtnText = document.getElementById('analyzeBtnText');
    const progressSection = document.getElementById('progressSection');
    const aiOutputSection = document.getElementById('aiOutputSection');

    try {
        isAnalyzing = true;
        analyzeBtn.disabled = true;
        analyzeBtn.classList.remove('btn-pulse');
        analyzeBtnText.textContent = 'Analyzing...';
        progressSection.classList.remove('hidden');
        aiOutputSection.classList.add('hidden'); 

        updateProgress(15, 'Consulting TechDesk AI...');
        await sleep(500);
        
        updateProgress(40, 'Processing industrial failure logs...');
        
        const response = await fetch(`${API_BASE_URL}/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ failure_description: failureDescription })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Diagnostic engine encountered an error.');
        }

        const data = await response.json();
        currentOutputData = data;
        
        updateProgress(75, 'Structuring actionable insights...');
        await sleep(600);
        
        updateProgress(100, 'Diagnostic complete.');
        await sleep(400);

        progressSection.classList.add('hidden');
        displayOutput(data);

    } catch (error) {
        console.error('Diagnostic Error:', error);
        alert('Diagnostic Failed: ' + error.message);
        progressSection.classList.add('hidden');
    } finally {
        isAnalyzing = false;
        analyzeBtn.disabled = false;
        analyzeBtnText.textContent = 'Begin Diagnostic';
    }
}

function updateProgress(percent, message) {
    const progressBar = document.getElementById('progressBar');
    const progressPercent = document.getElementById('progressPercent');
    const progressMessage = document.getElementById('progressMessage');
    
    if (progressBar) progressBar.style.width = percent + '%';
    if (progressPercent) progressPercent.textContent = percent + '%';
    if (progressMessage) progressMessage.textContent = message;
}

function displayOutput(data) {
    const aiOutputSection = document.getElementById('aiOutputSection');
    const outputCategory = document.getElementById('outputCategory');
    const outputRootCause = document.getElementById('outputRootCause');
    const outputActionPlan = document.getElementById('outputActionPlan');
    const outputLatency = document.getElementById('outputLatency');

    if (!aiOutputSection) return;

    // Latency Badge Logic
    const lat = data.latency || 0;
    outputLatency.textContent = `LATENCY: ${lat}s`;
    outputLatency.className = 'text-[10px] px-3 py-1 rounded-full font-bold ';
    if (lat < 3) {
        outputLatency.classList.add('latency-good');
    } else if (lat < 6) {
        outputLatency.classList.add('latency-warning');
    } else {
        outputLatency.classList.add('latency-bad');
    }

    // Update Text Content
    outputCategory.textContent = data.failure_category || 'UNCLASSIFIED';
    outputRootCause.textContent = data.root_cause || 'No root cause identified.';
    outputActionPlan.textContent = data.action_plan || 'No action plan generated.';

    // Update Category Color
    const categoryClasses = ['category-mechanical', 'category-electrical', 'category-process', 'category-maintenance', 'category-it-infrastructure'];
    outputCategory.classList.remove(...categoryClasses);
    if (data.failure_category) {
        const categoryClass = 'category-' + data.failure_category.toLowerCase().replace(' ', '-');
        outputCategory.classList.add(categoryClass);
    }

    aiOutputSection.classList.remove('hidden');
    aiOutputSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function copyToClipboard() {
    if (!currentOutputData) return;
    const jsonStr = JSON.stringify(currentOutputData, null, 2);
    navigator.clipboard.writeText(jsonStr).then(() => {
        const btn = document.querySelector('button[onclick="copyToClipboard()"]');
        const originalHtml = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check mr-1 text-green-500"></i> Copied!';
        setTimeout(() => { btn.innerHTML = originalHtml; }, 2000);
    });
}

// History logic
let historyData = [];
async function fetchHistory() {
    try {
        const response = await fetch(`${API_BASE_URL}/history`);
        historyData = await response.json();
        populateHistoryTable(historyData);
    } catch (e) { console.error('History fetch failed'); }
}

function populateHistoryTable(data) {
    const tableBody = document.getElementById('historyTableBody');
    tableBody.innerHTML = '';

    data.reverse().forEach((entry, index) => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-slate-50 transition-colors cursor-pointer';
        row.onclick = () => toggleHistoryLog(index);
        
        const lat = entry.latency || 0;
        const latClass = lat < 3 ? 'text-green-600' : (lat < 6 ? 'text-amber-600' : 'text-red-600');
        const status = entry.error ? 
            `<span class="flex items-center justify-end text-red-500 font-bold">FAIL <i class="fas fa-chevron-down ml-2 text-[10px]"></i></span>` : 
            `<span class="flex items-center justify-end text-green-500 font-bold">OK <i class="fas fa-chevron-down ml-2 text-[10px]"></i></span>`;
        
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-xs text-slate-400 font-mono">${new Date(entry.timestamp).toLocaleString()}</td>
            <td class="px-6 py-4 max-w-xs truncate font-medium text-slate-700" title="${entry.input_description}">${entry.input_description}</td>
            <td class="px-6 py-4">
                ${entry.ai_output ? `<span class="px-2 py-1 text-[10px] font-bold text-white rounded-md category-${entry.ai_output.failure_category.toLowerCase().replace(' ', '-')}">${entry.ai_output.failure_category}</span>` : '--'}
            </td>
            <td class="px-6 py-4 text-center font-mono text-xs ${latClass}">${lat}s</td>
            <td class="px-6 py-4 text-right">${status}</td>
        `;
        tableBody.appendChild(row);

        // Add Log Detail Row (Hidden by default)
        const logRow = document.createElement('tr');
        logRow.id = `history-log-${index}`;
        logRow.className = 'hidden bg-slate-900';
        logRow.innerHTML = `
            <td colspan="5" class="px-8 py-4">
                <div class="text-blue-300 font-mono text-xs space-y-2">
                    <p class="text-slate-500 border-b border-slate-800 pb-1 uppercase tracking-widest font-bold">Session Telemetry Log</p>
                    <pre class="whitespace-pre-wrap leading-relaxed">${entry.debug_logs || 'No detailed logs captured for this session.'}</pre>
                </div>
            </td>
        `;
        tableBody.appendChild(logRow);
    });
}

function toggleHistoryLog(index) {
    const logRow = document.getElementById(`history-log-${index}`);
    if (logRow) {
        logRow.classList.toggle('hidden');
        // Update chevron icon if needed (optional)
    }
}

function filterHistory() {
    const searchTerm = document.getElementById('historySearch').value.toLowerCase();
    const selectedCategory = document.getElementById('categoryFilter').value;
    const filtered = historyData.filter(entry => {
        const matchesSearch = entry.input_description.toLowerCase().includes(searchTerm);
        const matchesCategory = selectedCategory === 'all' || (entry.ai_output && entry.ai_output.failure_category === selectedCategory);
        return matchesSearch && matchesCategory;
    });
    populateHistoryTable(filtered);
}

// Benchmarking Logic
async function runBenchmark() {
    const btn = document.getElementById('runBenchmarkBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Evaluating...';

    try {
        const response = await fetch(`${API_BASE_URL}/benchmark`);
        const data = await response.json();
        
        // Update summary cards
        document.getElementById('totalCases').textContent = data.total_cases;
        document.getElementById('avgLatency').textContent = data.average_latency + 's';
        
        const accuracy = (data.accuracy_score * 100).toFixed(0);
        document.getElementById('accuracyScore').textContent = accuracy + '%';
        document.getElementById('accuracyProgress').style.width = accuracy + '%';

        // Populate table
        const tableBody = document.getElementById('benchmarkTableBody');
        tableBody.innerHTML = '';
        
        data.results.forEach(res => {
            const row = document.createElement('tr');
            if (!res.is_match) row.className = 'bg-red-50/50';
            
            const validation = res.is_match ? 
                '<span class="flex items-center justify-center text-green-600 font-bold"><i class="fas fa-check-circle mr-1"></i> MATCH</span>' : 
                '<span class="flex items-center justify-center text-red-600 font-bold"><i class="fas fa-triangle-exclamation mr-1"></i> MISMATCH</span>';
            
            const aiCategory = res.ai_category === 'Error' ? 
                '<span class="px-2 py-1 bg-red-100 text-red-700 rounded text-[10px] font-bold uppercase">Invalid Category Detected</span>' : 
                res.ai_category;

            row.innerHTML = `
                <td class="px-6 py-4 text-xs font-medium max-w-xs truncate text-slate-600" title="${res.description}">${res.description}</td>
                <td class="px-6 py-4 text-xs font-bold text-slate-500">${res.expected_category}</td>
                <td class="px-6 py-4 text-xs font-bold text-slate-700">${aiCategory}</td>
                <td class="px-6 py-4 text-center text-xs">${validation}</td>
                <td class="px-6 py-4 text-right font-mono text-xs text-slate-400">${res.latency}s</td>
            `;
            tableBody.appendChild(row);
        });
    } catch (error) {
        console.error('Benchmark failed:', error);
        alert('Benchmark Execution Failed.');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-play mr-2 text-xs"></i> Execute Evaluation';
    }
}

async function fetchLogs() {
    const logContainer = document.getElementById('logContent');
    logContainer.textContent = '>> ESTABLISHING TELEMETRY LINK...';
    
    try {
        const response = await fetch(`${API_BASE_URL}/logs`);
        if (!response.ok) throw new Error('Failed to fetch logs.');
        const data = await response.json();
        logContainer.textContent = data.logs || '>> NO TELEMETRY DATA FOUND.';
        logContainer.scrollTop = logContainer.scrollHeight;
    } catch (error) {
        logContainer.textContent = '>> ERROR: ' + error.message;
    }
}
