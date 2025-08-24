// Stack.com Style Takeoff Manager
class StackTakeoffManager {
    constructor() {
        this.currentProject = null;
        this.blueprints = [];
        this.takeoffItems = [];
        this.measurements = [];
        this.currentTool = 'select';
        this.currentView = 'plans';
        this.scale = { pixels: 100, realWorld: 10, unit: 'ft' };
        this.uploadedFiles = [];
        
        // Initialize keyboard shortcuts
        this.initializeKeyboardShortcuts();
    }

    init() {
        this.showStackInterface();
        this.loadBlueprints();
    }

    showStackInterface() {
        const content = `
            <!-- Stack-Style Professional Header -->
            <div class="stack-header bg-white border-bottom shadow-sm">
                <div class="container-fluid px-4 py-3">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h4 class="mb-0 fw-normal text-dark">New Project - ${new Date().toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric', 
                                year: 'numeric', 
                                hour: 'numeric', 
                                minute: '2-digit' 
                            })}</h4>
                        </div>
                        <div class="d-flex align-items-center gap-4">
                            <nav class="d-flex gap-4">
                                <a href="#" class="nav-link text-secondary px-0">HOME</a>
                                <a href="#" class="nav-link fw-semibold text-primary px-0 border-bottom border-primary">PLANS & TAKEOFFS</a>
                                <a href="#" class="nav-link text-secondary px-0">REPORTS</a>
                                <a href="#" class="nav-link text-secondary px-0">ESTIMATES</a>
                            </nav>
                            <div class="d-flex gap-3">
                                <button class="btn btn-link text-secondary p-0" style="text-decoration: none;">SHARE</button>
                                <button class="btn btn-link text-secondary p-0" style="text-decoration: none;">INVITE</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Stack-Style Navigation Tabs -->
            <div class="stack-nav bg-light border-bottom">
                <div class="container-fluid px-4">
                    <ul class="nav nav-tabs border-0" style="margin-bottom: -1px;">
                        <li class="nav-item">
                            <button class="nav-link active bg-white border border-bottom-0 px-4" onclick="stackManager.switchTab('plans')">
                                Plans
                            </button>
                        </li>
                        <li class="nav-item">
                            <button class="nav-link border-0 text-secondary px-4" onclick="stackManager.switchTab('takeoffs')">
                                Takeoffs
                            </button>
                        </li>
                        <li class="nav-item">
                            <button class="nav-link border-0 text-secondary px-4" onclick="stackManager.switchTab('libraries')">
                                Libraries
                            </button>
                        </li>
                    </ul>
                </div>
            </div>

            <!-- Main Stack Interface -->
            <div class="stack-interface">
                <div class="row g-0" style="height: calc(100vh - 140px);">
                    <!-- Left Sidebar - Plans & Documents -->
                    <div class="col-3 border-end bg-white">
                        <div class="h-100 d-flex flex-column">
                            <!-- Search and Upload Header -->
                            <div class="p-3 border-bottom bg-white">
                                <div class="d-flex gap-2 mb-3">
                                    <div class="input-group input-group-sm">
                                        <span class="input-group-text bg-white border-end-0">
                                            <i class="bi bi-search text-muted"></i>
                                        </span>
                                        <input type="text" class="form-control border-start-0 shadow-none" 
                                               placeholder="Search" 
                                               onkeyup="stackManager.filterFiles(this.value)">
                                    </div>
                                    <button class="btn btn-success btn-sm px-3" onclick="stackManager.showUploadModal()">
                                        Upload
                                    </button>
                                </div>
                            </div>

                            <!-- File Tree -->
                            <div class="flex-grow-1 overflow-auto">
                                <div class="p-3">
                                    <!-- Plans and Documents Header -->
                                    <div class="d-flex align-items-center justify-content-between py-2 mb-2">
                                        <div class="d-flex align-items-center">
                                            <i class="bi bi-folder2-open text-primary me-2"></i>
                                            <span class="fw-medium">Plans and Documents (<span id="fileCount">0</span>)</span>
                                        </div>
                                        <i class="bi bi-info-circle text-muted"></i>
                                    </div>
                                    
                                    <!-- File Categories -->
                                    <div class="ms-3">
                                        <div class="d-flex align-items-center py-2 text-muted small">
                                            <i class="bi bi-bookmark me-2"></i>
                                            <span>Bookmarks</span>
                                        </div>
                                        
                                        <div class="d-flex align-items-center justify-content-between py-2">
                                            <div class="d-flex align-items-center">
                                                <i class="bi bi-folder me-2 text-warning"></i>
                                                <span>Plans</span>
                                            </div>
                                            <div class="dropdown">
                                                <button class="btn btn-sm p-0" data-bs-toggle="dropdown">
                                                    <i class="bi bi-three-dots-vertical text-muted"></i>
                                                </button>
                                                <ul class="dropdown-menu dropdown-menu-sm">
                                                    <li><a class="dropdown-item small" href="#" onclick="stackManager.uploadToPlans()">Upload to Plans</a></li>
                                                    <li><a class="dropdown-item small" href="#" onclick="stackManager.createFolder()">Create Folder</a></li>
                                                </ul>
                                            </div>
                                        </div>
                                        
                                        <div class="d-flex align-items-center justify-content-between py-2">
                                            <div class="d-flex align-items-center">
                                                <i class="bi bi-folder me-2 text-info"></i>
                                                <span>Supporting Documents</span>
                                            </div>
                                            <div class="dropdown">
                                                <button class="btn btn-sm p-0" data-bs-toggle="dropdown">
                                                    <i class="bi bi-three-dots-vertical text-muted"></i>
                                                </button>
                                                <ul class="dropdown-menu dropdown-menu-sm">
                                                    <li><a class="dropdown-item small" href="#" onclick="stackManager.uploadDocuments()">Upload Documents</a></li>
                                                    <li><a class="dropdown-item small" href="#" onclick="stackManager.createFolder()">Create Folder</a></li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Blueprint Files List -->
                                    <div id="stackFilesList" class="mt-3">
                                        <!-- Files will be loaded here -->
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Center - Main Viewing Area -->
                    <div class="col-6 d-flex flex-column bg-white">
                        <!-- Top Controls Bar -->
                        <div class="viewer-controls bg-white border-bottom p-2">
                            <div class="d-flex align-items-center gap-3">
                                <div class="btn-group btn-group-sm">
                                    <button class="btn btn-light border" style="background: #f8f9fa;">
                                        <i class="bi bi-grid-3x3-gap me-1"></i>
                                        Overview
                                    </button>
                                </div>
                                <div style="width: 120px;">
                                    <select class="form-select form-select-sm" id="viewSelect">
                                        <option>Overview</option>
                                        <option>Sheet View</option>
                                        <option>Detail View</option>
                                    </select>
                                </div>
                                <div class="dropdown">
                                    <button class="btn btn-sm btn-light dropdown-toggle border" data-bs-toggle="dropdown">
                                        Sheet IDs
                                    </button>
                                    <ul class="dropdown-menu">
                                        <li><a class="dropdown-item small" href="#">Show Sheet IDs</a></li>
                                        <li><a class="dropdown-item small" href="#">Hide Sheet IDs</a></li>
                                        <li><a class="dropdown-item small" href="#">Sheet Properties</a></li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <!-- Main Upload/Viewer Area -->
                        <div class="main-viewer flex-grow-1 position-relative">
                            <!-- Stack-Style Upload Area -->
                            <div id="stackUploadArea" class="h-100 d-flex align-items-center justify-content-center bg-light">
                                <div class="upload-zone text-center" style="width: 70%; max-width: 500px;">
                                    <!-- Cloud Storage Icons -->
                                    <div class="cloud-integrations mb-4">
                                        <div class="d-flex justify-content-center gap-3 mb-4">
                                            <div class="cloud-icon p-3 bg-white border rounded shadow-sm">
                                                <i class="bi bi-file-earmark text-primary" style="font-size: 1.5rem;"></i>
                                            </div>
                                            <div class="cloud-icon p-3 bg-white border rounded shadow-sm">
                                                <i class="bi bi-camera text-success" style="font-size: 1.5rem;"></i>
                                            </div>
                                            <div class="cloud-icon p-3 bg-white border rounded shadow-sm">
                                                <i class="bi bi-question-circle text-secondary" style="font-size: 1.5rem;"></i>
                                            </div>
                                        </div>
                                        
                                        <!-- Cloud Service Icons -->
                                        <div class="d-flex justify-content-center gap-3 mb-4">
                                            <div class="cloud-service p-2" title="Dropbox">
                                                <i class="bi bi-dropbox text-primary"></i>
                                            </div>
                                            <div class="cloud-service p-2" title="Google Drive">
                                                <i class="bi bi-google text-danger"></i>
                                            </div>
                                            <div class="cloud-service p-2" title="OneDrive">
                                                <i class="bi bi-microsoft text-info"></i>
                                            </div>
                                            <div class="cloud-service p-2" title="Box">
                                                <i class="bi bi-box text-primary"></i>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Drop Zone -->
                                    <div class="drop-zone border-2 border-dashed rounded p-5 mb-3" 
                                         style="border-color: #dee2e6 !important;"
                                         ondrop="stackManager.handleDrop(event)" 
                                         ondragover="stackManager.handleDragOver(event)"
                                         ondragenter="stackManager.handleDragEnter(event)"
                                         ondragleave="stackManager.handleDragLeave(event)">
                                        <h4 class="mb-3 text-dark">Drop a file here</h4>
                                        <button class="btn btn-success" onclick="stackManager.triggerFileInput()">
                                            Choose a local file
                                        </button>
                                        <input type="file" id="stackFileInput" class="d-none" multiple 
                                               accept=".pdf,.jpg,.jpeg,.png,.tiff,.bmp,.dwg,.dxf,.svg" 
                                               onchange="stackManager.handleFileSelection(event)">
                                    </div>
                                    
                                    <!-- Upload Status -->
                                    <div class="upload-status">
                                        <div class="d-flex justify-content-between align-items-center p-2 rounded" style="background: #fff3cd;">
                                            <small class="text-muted">You've chosen <span id="selectedFileCount">0</span> files</small>
                                            <button class="btn btn-outline-secondary btn-sm" id="uploadDoneBtn" disabled onclick="stackManager.processUploads()">Done</button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Blueprint Viewer (Hidden initially) -->
                            <div id="stackBlueprintViewer" style="display: none;" class="h-100 position-relative overflow-auto">
                                <img id="stackBlueprintImage" class="w-100" style="min-height: 100%; object-fit: contain;" />
                                <canvas id="stackMeasurementCanvas" 
                                        class="position-absolute top-0 start-0" 
                                        style="pointer-events: auto; z-index: 10;"></canvas>
                            </div>
                        </div>
                    </div>

                    <!-- Right Sidebar - Tools & Takeoffs -->
                    <div class="col-3 border-start bg-white">
                        <div class="h-100 d-flex flex-column">
                            <!-- Tool Palette -->
                            <div class="tool-palette p-3 border-bottom">
                                <div class="d-grid gap-1">
                                    <button class="btn btn-outline-primary btn-sm d-flex align-items-center justify-content-between py-2" 
                                            onclick="stackManager.showUploadModal()" 
                                            title="Upload files">
                                        <div class="d-flex align-items-center">
                                            <i class="bi bi-upload me-2"></i>
                                            <span>Upload</span>
                                        </div>
                                        <small class="text-muted">⌘U</small>
                                    </button>
                                    
                                    <button class="btn btn-outline-primary btn-sm d-flex align-items-center justify-content-between py-2"
                                            onclick="stackManager.openSelected()" 
                                            title="Open selected file">
                                        <div class="d-flex align-items-center">
                                            <i class="bi bi-folder-open me-2"></i>
                                            <span>Open</span>
                                        </div>
                                        <small class="text-muted">⌘O</small>
                                    </button>
                                    
                                    <button class="btn btn-outline-success btn-sm d-flex align-items-center justify-content-between py-2 tool-btn" 
                                            data-tool="measure" 
                                            onclick="stackManager.setTool('measure')" 
                                            title="Linear measurement tool">
                                        <div class="d-flex align-items-center">
                                            <i class="bi bi-rulers me-2"></i>
                                            <span>Linear</span>
                                        </div>
                                        <small class="text-muted">L</small>
                                    </button>
                                    
                                    <button class="btn btn-outline-warning btn-sm d-flex align-items-center justify-content-between py-2" 
                                            onclick="stackManager.undoLast()" 
                                            title="Undo last action">
                                        <div class="d-flex align-items-center">
                                            <i class="bi bi-arrow-counterclockwise me-2"></i>
                                            <span>Undo</span>
                                        </div>
                                        <small class="text-muted">⌘Z</small>
                                    </button>
                                    
                                    <button class="btn btn-outline-danger btn-sm d-flex align-items-center justify-content-between py-2" 
                                            onclick="stackManager.deleteSelected()" 
                                            title="Delete selected items">
                                        <div class="d-flex align-items-center">
                                            <i class="bi bi-trash me-2"></i>
                                            <span>Delete</span>
                                        </div>
                                        <small class="text-muted">⌦</small>
                                    </button>
                                    
                                    <button class="btn btn-outline-secondary btn-sm d-flex align-items-center justify-content-between py-2" 
                                            onclick="stackManager.printView()" 
                                            title="Print current view">
                                        <div class="d-flex align-items-center">
                                            <i class="bi bi-printer me-2"></i>
                                            <span>Print</span>
                                        </div>
                                        <small class="text-muted">⌘P</small>
                                    </button>
                                </div>
                            </div>

                            <!-- Takeoff Items -->
                            <div class="takeoffs-panel flex-grow-1 overflow-auto">
                                <div class="p-3">
                                    <div class="d-flex justify-content-between align-items-center mb-3">
                                        <h6 class="mb-0 fw-medium">Active Takeoffs</h6>
                                        <small class="text-muted"><span id="takeoffCount">0</span> items</small>
                                    </div>
                                    <div id="stackTakeoffItems">
                                        <div class="text-center text-muted py-4">
                                            <i class="bi bi-rulers fs-2 d-block mb-2 opacity-50"></i>
                                            <small>Start measuring to create takeoffs</small>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Export Actions -->
                            <div class="export-panel p-3 border-top bg-light">
                                <button id="stackExportBtn" class="btn btn-success w-100" disabled onclick="stackManager.exportToEstimates()">
                                    <i class="bi bi-calculator me-2"></i>
                                    Export to Estimates
                                </button>
                                <div class="mt-2">
                                    <button class="btn btn-outline-secondary btn-sm w-100" onclick="stackManager.saveTakeoffs()">
                                        <i class="bi bi-save me-1"></i>
                                        Save Takeoffs
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style>
                .stack-header {
                    position: sticky;
                    top: 0;
                    z-index: 1020;
                }
                
                .stack-nav {
                    position: sticky;
                    top: 70px;
                    z-index: 1019;
                }
                
                .cloud-service {
                    font-size: 1.2rem;
                    opacity: 0.7;
                    transition: opacity 0.2s;
                }
                
                .cloud-service:hover {
                    opacity: 1;
                }
                
                .drop-zone {
                    transition: all 0.2s ease;
                }
                
                .drop-zone.drag-over {
                    border-color: #0d6efd !important;
                    background-color: rgba(13, 110, 253, 0.1);
                }
                
                .tool-btn.active {
                    background-color: #0d6efd;
                    color: white;
                    border-color: #0d6efd;
                }
                
                .nav-link {
                    text-decoration: none !important;
                }
                
                #stackMeasurementCanvas {
                    cursor: crosshair;
                }
                
                .file-item {
                    padding: 8px 12px;
                    margin: 2px 0;
                    border-radius: 4px;
                    cursor: pointer;
                    transition: background-color 0.15s;
                }
                
                .file-item:hover {
                    background-color: #f8f9fa;
                }
                
                .file-item.selected {
                    background-color: #e3f2fd;
                    border-left: 3px solid #2196f3;
                }
                
                .takeoff-item {
                    background: white;
                    border: 1px solid #e9ecef;
                    border-radius: 6px;
                    margin-bottom: 8px;
                    padding: 10px;
                    transition: all 0.15s;
                }
                
                .takeoff-item:hover {
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                    transform: translateY(-1px);
                }
            </style>
        `;

        document.getElementById('mainContent').innerHTML = content;
        this.updateFileCount();
    }

    // Tab Management
    switchTab(tab) {
        this.currentView = tab;
        
        // Update active tab
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active', 'bg-white', 'border', 'border-bottom-0');
            link.classList.add('border-0', 'text-secondary');
        });
        
        event.target.classList.remove('border-0', 'text-secondary');
        event.target.classList.add('active', 'bg-white', 'border', 'border-bottom-0');
        
        this.loadViewContent(tab);
    }

    loadViewContent(tab) {
        switch(tab) {
            case 'plans':
                this.loadBlueprints();
                break;
            case 'takeoffs':
                this.loadTakeoffs();
                break;
            case 'libraries':
                this.loadLibraries();
                break;
        }
    }

    // File Management
    async loadBlueprints() {
        try {
            const response = await fetch('/api/blueprints');
            this.blueprints = await response.json();
            this.renderFilesList();
            this.updateFileCount();
        } catch (error) {
            console.error('Failed to load blueprints:', error);
            this.renderFilesList([]);
        }
    }

    renderFilesList() {
        const container = document.getElementById('stackFilesList');
        
        if (!this.blueprints || this.blueprints.length === 0) {
            container.innerHTML = `
                <div class="text-center text-muted py-3">
                    <i class="bi bi-folder2-open opacity-50 fs-3 d-block mb-2"></i>
                    <small>No files uploaded yet</small>
                </div>
            `;
            return;
        }

        const html = this.blueprints.map(file => `
            <div class="file-item d-flex align-items-center justify-content-between" 
                 onclick="stackManager.selectFile(${file.id})">
                <div class="d-flex align-items-center">
                    <i class="bi bi-file-earmark-${this.getFileIcon(file.type)} me-2 text-primary"></i>
                    <div>
                        <div class="fw-medium small">${file.name}</div>
                        <div class="text-muted" style="font-size: 0.75rem;">
                            ${file.type} • ${this.formatFileSize(file.size)} • ${new Date(file.uploaded).toLocaleDateString()}
                        </div>
                    </div>
                </div>
                <div class="dropdown">
                    <button class="btn btn-sm p-1" data-bs-toggle="dropdown" onclick="event.stopPropagation()">
                        <i class="bi bi-three-dots-vertical text-muted"></i>
                    </button>
                    <ul class="dropdown-menu dropdown-menu-sm">
                        <li><a class="dropdown-item small" href="#" onclick="stackManager.openFile(${file.id})">Open</a></li>
                        <li><a class="dropdown-item small" href="#" onclick="stackManager.downloadFile(${file.id})">Download</a></li>
                        <li><hr class="dropdown-divider"></li>
                        <li><a class="dropdown-item small text-danger" href="#" onclick="stackManager.deleteFile(${file.id})">Delete</a></li>
                    </ul>
                </div>
            </div>
        `).join('');

        container.innerHTML = html;
    }

    getFileIcon(type) {
        const icons = {
            'PDF': 'pdf',
            'JPG': 'image', 'JPEG': 'image', 'PNG': 'image', 'TIFF': 'image', 'BMP': 'image',
            'DWG': 'code', 'DXF': 'code'
        };
        return icons[type.toUpperCase()] || 'text';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    updateFileCount() {
        const count = this.blueprints ? this.blueprints.length : 0;
        const countElement = document.getElementById('fileCount');
        if (countElement) {
            countElement.textContent = count;
        }
    }

    selectFile(fileId) {
        // Remove previous selection
        document.querySelectorAll('.file-item').forEach(item => {
            item.classList.remove('selected');
        });
        
        // Add selection to current item
        event.currentTarget.classList.add('selected');
        
        const file = this.blueprints.find(f => f.id === fileId);
        if (file) {
            this.currentFile = file;
            this.openFile(fileId);
        }
    }

    openFile(fileId) {
        const file = this.blueprints.find(f => f.id === fileId);
        if (!file) return;

        this.currentFile = file;
        this.showBlueprintViewer(file);
    }

    showBlueprintViewer(file) {
        // Hide upload area, show viewer
        document.getElementById('stackUploadArea').style.display = 'none';
        document.getElementById('stackBlueprintViewer').style.display = 'block';

        // Load the blueprint image
        const img = document.getElementById('stackBlueprintImage');
        img.src = this.createBlueprintPreview(file);
        
        img.onload = () => {
            this.setupCanvas();
            this.initializeMeasurementTools();
        };
    }

    createBlueprintPreview(file) {
        // Create a realistic blueprint preview (in production, this would load the actual file)
        const canvas = document.createElement('canvas');
        canvas.width = 1200;
        canvas.height = 800;
        const ctx = canvas.getContext('2d');

        // White background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw realistic blueprint content
        ctx.strokeStyle = '#1565c0';
        ctx.lineWidth = 2;
        ctx.font = 'bold 24px Arial';
        ctx.fillStyle = '#1565c0';

        // Title block
        ctx.fillText(file.name.replace('.pdf', ''), 50, 50);
        ctx.font = '16px Arial';
        ctx.fillText(`Project: ${file.project_name || 'Construction Project'}`, 50, 80);
        ctx.fillText(`Scale: ${file.scale || '1:100'}`, 50, 100);
        ctx.fillText(`Date: ${new Date(file.uploaded).toLocaleDateString()}`, 50, 120);

        // Draw building outline
        ctx.beginPath();
        ctx.rect(100, 180, 1000, 500);
        ctx.stroke();

        // Interior walls and rooms
        const rooms = [
            { x: 120, y: 200, w: 300, h: 200, label: 'Living Room\n20\' x 16\'' },
            { x: 440, y: 200, w: 250, h: 200, label: 'Kitchen\n18\' x 16\'' },
            { x: 710, y: 200, w: 200, h: 200, label: 'Dining\n14\' x 16\'' },
            { x: 930, y: 200, w: 150, h: 200, label: 'Bath\n10\' x 16\'' },
            { x: 120, y: 420, w: 200, h: 240, label: 'Bedroom 1\n16\' x 18\'' },
            { x: 340, y: 420, w: 200, h: 240, label: 'Bedroom 2\n16\' x 18\'' },
            { x: 560, y: 420, w: 250, h: 240, label: 'Master BR\n20\' x 18\'' }
        ];

        ctx.lineWidth = 1.5;
        rooms.forEach(room => {
            ctx.beginPath();
            ctx.rect(room.x, room.y, room.w, room.h);
            ctx.stroke();
            
            // Room labels
            ctx.fillStyle = '#1565c0';
            ctx.font = '12px Arial';
            const lines = room.label.split('\\n');
            lines.forEach((line, i) => {
                ctx.fillText(line, room.x + 10, room.y + 20 + (i * 15));
            });
        });

        // Dimension lines
        ctx.strokeStyle = '#d32f2f';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        
        // Overall dimensions
        ctx.beginPath();
        ctx.moveTo(100, 150);
        ctx.lineTo(1100, 150);
        ctx.stroke();
        
        ctx.setLineDash([]);
        ctx.fillStyle = '#d32f2f';
        ctx.font = '14px Arial';
        ctx.fillText('50\'-0"', 580, 140);

        // Doors and windows
        ctx.strokeStyle = '#4caf50';
        ctx.lineWidth = 3;
        
        // Front door
        ctx.beginPath();
        ctx.arc(600, 180, 25, 0, Math.PI);
        ctx.stroke();
        
        // Windows
        const windows = [
            { x: 200, y: 180, w: 60 }, { x: 300, y: 180, w: 60 },
            { x: 500, y: 180, w: 80 }, { x: 800, y: 180, w: 60 }
        ];
        
        windows.forEach(win => {
            ctx.beginPath();
            ctx.moveTo(win.x, win.y);
            ctx.lineTo(win.x + win.w, win.y);
            ctx.lineWidth = 4;
            ctx.stroke();
        });

        return canvas.toDataURL();
    }

    setupCanvas() {
        const canvas = document.getElementById('stackMeasurementCanvas');
        const img = document.getElementById('stackBlueprintImage');
        
        // Resize canvas to match image
        const rect = img.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        canvas.style.width = rect.width + 'px';
        canvas.style.height = rect.height + 'px';
        
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
    }

    // File Upload Handling
    showUploadModal() {
        this.triggerFileInput();
    }

    triggerFileInput() {
        document.getElementById('stackFileInput').click();
    }

    handleFileSelection(event) {
        const files = Array.from(event.target.files);
        this.uploadedFiles = files;
        this.updateUploadStatus();
    }

    handleDrop(event) {
        event.preventDefault();
        event.stopPropagation();
        
        const files = Array.from(event.dataTransfer.files);
        this.uploadedFiles = files;
        this.updateUploadStatus();
        
        // Remove drag styling
        this.handleDragLeave(event);
    }

    handleDragOver(event) {
        event.preventDefault();
        event.stopPropagation();
    }

    handleDragEnter(event) {
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.classList.add('drag-over');
    }

    handleDragLeave(event) {
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.classList.remove('drag-over');
    }

    updateUploadStatus() {
        const count = this.uploadedFiles.length;
        document.getElementById('selectedFileCount').textContent = count;
        document.getElementById('uploadDoneBtn').disabled = count === 0;
        
        if (count > 0) {
            document.getElementById('uploadDoneBtn').classList.remove('btn-outline-secondary');
            document.getElementById('uploadDoneBtn').classList.add('btn-success');
        }
    }

    async processUploads() {
        if (this.uploadedFiles.length === 0) return;

        try {
            const formData = new FormData();
            this.uploadedFiles.forEach(file => {
                formData.append('files', file);
            });

            formData.append('project_name', 'Stack Project ' + new Date().toLocaleDateString());

            const response = await fetch('/api/blueprints/upload', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();
            
            if (result.success) {
                this.showAlert('success', `${result.uploaded_files.length} file(s) uploaded successfully!`);
                await this.loadBlueprints();
                this.resetUploadArea();
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('Upload failed:', error);
            this.showAlert('error', 'Upload failed: ' + error.message);
        }
    }

    resetUploadArea() {
        this.uploadedFiles = [];
        document.getElementById('stackFileInput').value = '';
        this.updateUploadStatus();
        document.getElementById('uploadDoneBtn').classList.remove('btn-success');
        document.getElementById('uploadDoneBtn').classList.add('btn-outline-secondary');
    }

    // Measurement Tools
    initializeMeasurementTools() {
        if (!this.canvas) return;

        this.canvas.addEventListener('mousedown', (e) => this.handleCanvasMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleCanvasMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleCanvasMouseUp(e));
        
        this.isDrawing = false;
        this.measurements = [];
    }

    setTool(tool) {
        this.currentTool = tool;
        
        // Update tool buttons
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const activeBtn = document.querySelector(`[data-tool="${tool}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }

        // Update cursor
        if (this.canvas) {
            this.canvas.style.cursor = tool === 'measure' ? 'crosshair' : 'default';
        }
    }

    handleCanvasMouseDown(e) {
        if (this.currentTool !== 'measure') return;
        
        const rect = this.canvas.getBoundingClientRect();
        this.startPoint = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
        this.isDrawing = true;
    }

    handleCanvasMouseMove(e) {
        if (!this.isDrawing || this.currentTool !== 'measure') return;
        
        const rect = this.canvas.getBoundingClientRect();
        const currentPoint = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };

        // Clear and redraw
        this.redrawCanvas();
        
        // Draw current line
        this.ctx.strokeStyle = '#ff0000';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(this.startPoint.x, this.startPoint.y);
        this.ctx.lineTo(currentPoint.x, currentPoint.y);
        this.ctx.stroke();
    }

    handleCanvasMouseUp(e) {
        if (!this.isDrawing || this.currentTool !== 'measure') return;
        
        const rect = this.canvas.getBoundingClientRect();
        const endPoint = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };

        this.isDrawing = false;
        this.addMeasurement(this.startPoint, endPoint);
    }

    addMeasurement(start, end) {
        const pixelDistance = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
        const realDistance = (pixelDistance * this.scale.realWorld) / this.scale.pixels;
        
        const measurement = {
            id: Date.now(),
            start,
            end,
            pixelDistance,
            realDistance,
            unit: this.scale.unit
        };

        this.measurements.push(measurement);
        this.addTakeoffItem(`Linear Measurement`, realDistance, this.scale.unit);
        this.redrawCanvas();
    }

    redrawCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Redraw all measurements
        this.measurements.forEach(measurement => {
            this.ctx.strokeStyle = '#0066cc';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(measurement.start.x, measurement.start.y);
            this.ctx.lineTo(measurement.end.x, measurement.end.y);
            this.ctx.stroke();
            
            // Add dimension text
            const midX = (measurement.start.x + measurement.end.x) / 2;
            const midY = (measurement.start.y + measurement.end.y) / 2;
            
            this.ctx.fillStyle = '#0066cc';
            this.ctx.font = '12px Arial';
            this.ctx.fillText(
                `${measurement.realDistance.toFixed(2)} ${measurement.unit}`, 
                midX + 5, midY - 5
            );
        });
    }

    addTakeoffItem(name, quantity, unit) {
        const item = {
            id: Date.now() + Math.random(),
            name,
            quantity: quantity.toFixed(2),
            unit,
            timestamp: new Date().toLocaleString()
        };

        this.takeoffItems.push(item);
        this.renderTakeoffItems();
        this.updateExportButton();
    }

    renderTakeoffItems() {
        const container = document.getElementById('stackTakeoffItems');
        
        if (this.takeoffItems.length === 0) {
            container.innerHTML = `
                <div class="text-center text-muted py-4">
                    <i class="bi bi-rulers fs-2 d-block mb-2 opacity-50"></i>
                    <small>Start measuring to create takeoffs</small>
                </div>
            `;
            return;
        }

        const html = this.takeoffItems.map(item => `
            <div class="takeoff-item">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <strong class="text-primary small">${item.name}</strong>
                    <button class="btn btn-sm p-0 text-danger" onclick="stackManager.removeTakeoffItem(${item.id})">
                        <i class="bi bi-x"></i>
                    </button>
                </div>
                <div class="d-flex justify-content-between align-items-center">
                    <span class="badge bg-light text-dark">${item.quantity} ${item.unit}</span>
                    <small class="text-muted">${item.timestamp}</small>
                </div>
            </div>
        `).join('');

        container.innerHTML = html;
        
        // Update count
        document.getElementById('takeoffCount').textContent = this.takeoffItems.length;
    }

    removeTakeoffItem(itemId) {
        this.takeoffItems = this.takeoffItems.filter(item => item.id !== itemId);
        this.measurements = this.measurements.filter(m => m.id !== itemId);
        this.renderTakeoffItems();
        this.updateExportButton();
        this.redrawCanvas();
    }

    updateExportButton() {
        const btn = document.getElementById('stackExportBtn');
        const hasItems = this.takeoffItems.length > 0;
        
        btn.disabled = !hasItems;
        btn.innerHTML = hasItems 
            ? `<i class="bi bi-calculator me-2"></i>Export to Estimates (${this.takeoffItems.length})`
            : `<i class="bi bi-calculator me-2"></i>Export to Estimates`;
    }

    // Actions
    exportToEstimates() {
        if (this.takeoffItems.length === 0) {
            this.showAlert('warning', 'No takeoff items to export');
            return;
        }

        // Convert to format expected by estimating module
        const exportData = this.takeoffItems.map(item => ({
            id: item.id,
            item: item.name,
            quantity: parseFloat(item.quantity),
            unit: item.unit,
            measurement: `${item.quantity} ${item.unit}`,
            notes: `Measured from ${this.currentFile?.name || 'blueprint'}`,
            blueprint: this.currentFile?.name || 'Stack Project'
        }));

        localStorage.setItem('blueprintMeasurements', JSON.stringify(exportData));
        
        // Switch to estimating module
        if (window.app && window.app.loadModule) {
            window.app.loadModule('takeoff');
        }
        
        this.showAlert('success', `${this.takeoffItems.length} takeoff items exported to estimates!`);
    }

    undoLast() {
        if (this.measurements.length > 0) {
            this.measurements.pop();
        }
        if (this.takeoffItems.length > 0) {
            this.takeoffItems.pop();
        }
        this.renderTakeoffItems();
        this.updateExportButton();
        this.redrawCanvas();
    }

    deleteSelected() {
        // Clear all measurements and takeoffs
        this.measurements = [];
        this.takeoffItems = [];
        this.renderTakeoffItems();
        this.updateExportButton();
        this.redrawCanvas();
    }

    saveTakeoffs() {
        if (this.takeoffItems.length === 0) {
            this.showAlert('warning', 'No takeoffs to save');
            return;
        }
        
        // In production, this would save to backend
        const takeoffData = {
            project: this.currentFile?.project_name || 'Stack Project',
            file: this.currentFile?.name || 'Unknown',
            takeoffs: this.takeoffItems,
            saved: new Date().toISOString()
        };
        
        localStorage.setItem('stackTakeoffs', JSON.stringify(takeoffData));
        this.showAlert('success', 'Takeoffs saved successfully!');
    }

    printView() {
        window.print();
    }

    // Utility methods
    filterFiles(searchTerm) {
        const items = document.querySelectorAll('.file-item');
        items.forEach(item => {
            const text = item.textContent.toLowerCase();
            item.style.display = text.includes(searchTerm.toLowerCase()) ? 'flex' : 'none';
        });
    }

    initializeKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Only handle shortcuts when Stack interface is active
            if (!document.getElementById('stackUploadArea')) return;
            
            if (e.metaKey || e.ctrlKey) {
                switch(e.key.toLowerCase()) {
                    case 'u':
                        e.preventDefault();
                        this.showUploadModal();
                        break;
                    case 'o':
                        e.preventDefault();
                        this.openSelected();
                        break;
                    case 'z':
                        e.preventDefault();
                        this.undoLast();
                        break;
                    case 'p':
                        e.preventDefault();
                        this.printView();
                        break;
                }
            } else {
                switch(e.key.toLowerCase()) {
                    case 'l':
                        this.setTool('measure');
                        break;
                    case 'escape':
                        this.setTool('select');
                        break;
                }
            }
        });
    }

    showAlert(type, message) {
        // Use app alert system if available
        if (window.app && window.app.showAlert) {
            window.app.showAlert(type, message);
        } else {
            alert(message);
        }
    }

    // Additional methods for complete functionality
    loadTakeoffs() {
        // Load saved takeoffs view
        console.log('Loading takeoffs view...');
    }

    loadLibraries() {
        // Load libraries view
        console.log('Loading libraries view...');
    }

    uploadToPlans() {
        this.showUploadModal();
    }

    uploadDocuments() {
        this.showUploadModal();
    }

    createFolder() {
        const folderName = prompt('Enter folder name:');
        if (folderName) {
            console.log('Creating folder:', folderName);
            // Implement folder creation
        }
    }

    openSelected() {
        if (this.currentFile) {
            this.openFile(this.currentFile.id);
        } else {
            this.showAlert('info', 'Please select a file first');
        }
    }

    downloadFile(fileId) {
        const file = this.blueprints.find(f => f.id === fileId);
        if (file) {
            console.log('Downloading:', file.name);
            // Implement download functionality
        }
    }

    deleteFile(fileId) {
        if (confirm('Are you sure you want to delete this file?')) {
            // Implement file deletion
            console.log('Deleting file:', fileId);
        }
    }
}

// Initialize Stack Manager
const stackManager = new StackTakeoffManager();