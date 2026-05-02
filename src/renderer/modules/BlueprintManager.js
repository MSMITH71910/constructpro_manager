// Blueprint Manager - Advanced blueprint viewing and takeoff tools
class BlueprintManager {
    constructor() {
        this.blueprints = [];
        this.currentBlueprint = null;
        this.currentProject = null;
        this.measurements = [];
        this.takeoffItems = [];
        this.currentTool = 'select'; // select, measure, area, count
        this.scale = { pixels: 100, realWorld: 10, unit: 'ft' }; // 100px = 10ft
        this.isDrawing = false;
        this.canvas = null;
        this.ctx = null;
        this.startPoint = null;
        this.currentPath = [];
        this.annotations = [];
        this.init();
    }

    init() {
        console.log('BlueprintManager initialized');
        this.setupKeyboardShortcuts();
        this.setupProjectListeners();
    }

    setupProjectListeners() {
        // Listen for project selection changes
        window.addEventListener('projectSelected', (event) => {
            this.setCurrentProject(event.detail.project);
        });
    }

    setCurrentProject(project) {
        this.currentProject = project;
        console.log('BlueprintManager: Current project set to:', project?.name);
        this.refreshProjectBlueprints();
    }

    refreshProjectBlueprints() {
        if (this.currentProject && window.dataManager) {
            const projectBlueprints = window.dataManager.data.blueprints.filter(
                bp => bp.project_id == this.currentProject.id
            );
            this.blueprints = projectBlueprints;
            // Refresh UI if blueprint interface is currently shown
            if (document.getElementById('mainContent').innerHTML.includes('Blueprint Manager')) {
                this.showBlueprintInterface();
            }
        }
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (!this.currentBlueprint) return;
            
            switch(e.key) {
                case 'Escape':
                    this.setTool('select');
                    break;
                case 'm':
                case 'M':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        this.setTool('measure');
                    }
                    break;
                case 'a':
                case 'A':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        this.setTool('area');
                    }
                    break;
                case 'c':
                case 'C':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        this.setTool('count');
                    }
                    break;
            }
        });
    }

    // Show Stack-Style Professional Interface
    showBlueprintInterface() {
        if (!document.getElementById('uploadBlueprintModal')) {
            this.injectUploadModal();
        }
        const currentProjectHeader = this.currentProject ? `
            <div class="card border-0 shadow-sm mb-4 border-start border-4 border-primary">
                <div class="card-body py-2">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <span class="text-muted small text-uppercase fw-bold">Active Project</span>
                            <h5 class="mb-0 text-primary">${this.currentProject.name}</h5>
                        </div>
                        <div class="d-flex gap-2">
                            <span class="badge bg-light text-dark border p-2">${this.blueprints.length} Sheets</span>
                            <span class="badge bg-primary-subtle text-primary p-2">${this.currentProject.status.toUpperCase()}</span>
                        </div>
                    </div>
                </div>
            </div>
        ` : `
            <div class="card border-0 shadow-sm mb-4 bg-warning-subtle">
                <div class="card-body py-3 d-flex align-items-center">
                    <i class="bi bi-exclamation-triangle-fill text-warning fs-3 me-3"></i>
                    <div>
                        <h6 class="mb-0 fw-bold">No project selected</h6>
                        <small>Select a project to manage blueprints and takeoffs. <a href="#" onclick="app.loadModule('projects')" class="text-primary fw-bold">Browse Projects</a></small>
                    </div>
                </div>
            </div>
        `;

        const content = `
            ${currentProjectHeader}
            <div class="row mb-4">
                <div class="col-12">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h2 class="mb-1 fw-bold"><i class="bi bi-file-earmark-image text-primary"></i> Blueprint & Document Manager</h2>
                            <p class="text-muted">High-resolution viewer with precision takeoff tools</p>
                        </div>
                        <div class="btn-group">
                            <button class="btn btn-primary px-4 shadow-sm" onclick="blueprintManager.showUploadModal()">
                                <i class="bi bi-cloud-upload me-1"></i> Upload Sheets
                            </button>
                            <button class="btn btn-outline-secondary" onclick="blueprintManager.showLibrary()">
                                <i class="bi bi-grid-3x3-gap"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="row mb-4" style="height: calc(100vh - 350px); min-height: 600px;">
                <!-- Left Sidebar - Sheets -->
                <div class="col-lg-3">
                    <div class="card border-0 shadow-sm h-100">
                        <div class="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
                            <h5 class="mb-0 fw-bold small text-uppercase">Project Sheets</h5>
                            <span class="badge bg-light text-dark border" id="sheetCount">${this.blueprints.length}</span>
                        </div>
                        <div class="card-body p-0 overflow-auto">
                            <div class="list-group list-group-flush" id="blueprintList">
                                <!-- Blueprints will be loaded here -->
                                ${this.blueprints.length === 0 ? `
                                    <div class="text-center py-5 px-3">
                                        <i class="bi bi-images text-muted fs-1 d-block mb-3"></i>
                                        <p class="text-muted small">No blueprints uploaded for this project yet.</p>
                                        <button class="btn btn-sm btn-primary" onclick="blueprintManager.showUploadModal()">Upload Now</button>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Center - Viewer -->
                <div class="col-lg-7">
                    <div class="card border-0 shadow-sm h-100 overflow-hidden">
                        <div class="card-header bg-white border-bottom p-2">
                            <div class="d-flex justify-content-between align-items-center">
                                <div class="btn-toolbar" role="toolbar">
                                    <div class="btn-group btn-group-sm me-2">
                                        <button class="btn btn-light border ${this.currentTool === 'select' ? 'active bg-primary-subtle border-primary' : ''}" onclick="blueprintManager.setTool('select')" title="Select Tool (V)">
                                            <i class="bi bi-cursor"></i>
                                        </button>
                                        <button class="btn btn-light border ${this.currentTool === 'measure' ? 'active bg-primary-subtle border-primary' : ''}" onclick="blueprintManager.setTool('measure')" title="Measure Tool (M)">
                                            <i class="bi bi-ruler"></i>
                                        </button>
                                        <button class="btn btn-light border ${this.currentTool === 'area' ? 'active bg-primary-subtle border-primary' : ''}" onclick="blueprintManager.setTool('area')" title="Area Tool (A)">
                                            <i class="bi bi-bounding-box-circles"></i>
                                        </button>
                                        <button class="btn btn-light border ${this.currentTool === 'count' ? 'active bg-primary-subtle border-primary' : ''}" onclick="blueprintManager.setTool('count')" title="Count Tool (C)">
                                            <i class="bi bi-123"></i>
                                        </button>
                                    </div>
                                    <div class="btn-group btn-group-sm">
                                        <button class="btn btn-light border" onclick="blueprintManager.zoomIn()"><i class="bi bi-zoom-in"></i></button>
                                        <button class="btn btn-light border" onclick="blueprintManager.zoomOut()"><i class="bi bi-zoom-out"></i></button>
                                        <button class="btn btn-light border" onclick="blueprintManager.fitToScreen()"><i class="bi bi-fullscreen"></i></button>
                                    </div>
                                </div>
                                <div id="viewerStatus" class="small text-muted fw-bold">
                                    ${this.currentBlueprint ? this.currentBlueprint.name : 'No sheet selected'}
                                </div>
                            </div>
                        </div>
                        <div class="card-body p-0 bg-dark position-relative" style="cursor: crosshair;">
                            <div id="blueprintContainer" class="w-100 h-100 d-flex align-items-center justify-content-center overflow-auto">
                                ${this.currentBlueprint ? `
                                    <canvas id="blueprintCanvas" class="shadow-lg"></canvas>
                                ` : `
                                    <div class="text-center text-white opacity-50">
                                        <i class="bi bi-file-earmark-image display-1 d-block mb-3"></i>
                                        <h5>Select a sheet to view</h5>
                                    </div>
                                `}
                            </div>
                            
                            <!-- Scale Info Overlay -->
                            <div class="position-absolute bottom-0 start-0 m-3 p-2 bg-white rounded shadow-sm small border-start border-4 border-info" id="scaleInfo" style="display: none;">
                                <i class="bi bi-info-circle text-info me-1"></i>
                                Scale: <span id="currentScaleText">Not set</span>
                                <button class="btn btn-link btn-sm p-0 ms-2 text-decoration-none" onclick="blueprintManager.showScaleModal()">Edit</button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Right Sidebar - Measurements -->
                <div class="col-lg-2">
                    <div class="card border-0 shadow-sm h-100">
                        <div class="card-header bg-white py-3 border-bottom">
                            <h5 class="mb-0 fw-bold small text-uppercase">Takeoff List</h5>
                        </div>
                        <div class="card-body p-0 overflow-auto">
                            <div class="list-group list-group-flush" id="measurementList">
                                <!-- Measurements loaded here -->
                                <div class="p-3 text-center text-muted small">No measurements yet</div>
                            </div>
                        </div>
                        <div class="card-footer bg-white border-top p-3">
                            <div class="d-grid">
                                <button class="btn btn-sm btn-success fw-bold" onclick="blueprintManager.exportToEstimate()">
                                    <i class="bi bi-box-arrow-right me-1"></i> Send to Estimate
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('mainContent').innerHTML = content;
        
        if (this.blueprints.length > 0) {
            this.loadBlueprintsList();
        }
    }

    loadBlueprintsList() {
        const container = document.getElementById('blueprintList');
        if (!container) return;

        const html = this.blueprints.map(blueprint => `
            <div class="blueprint-item border rounded p-3 mb-2 hover-shadow" 
                 style="cursor: pointer;" 
                 onclick="blueprintManager.selectBlueprint('${blueprint.id}')">
                <div class="d-flex justify-content-between align-items-start">
                    <div class="flex-grow-1">
                        <h6 class="mb-1">${blueprint.name}</h6>
                        <small class="text-muted">
                            ${blueprint.type} • ${blueprint.pages} page(s)<br>
                            Uploaded: ${new Date(blueprint.uploaded).toLocaleDateString()}
                        </small>
                    </div>
                    <div class="text-end">
                        <i class="bi bi-file-earmark-${blueprint.type.toLowerCase()} fs-4 text-primary"></i>
                    </div>
                </div>
            </div>
        `).join('');
        
        container.innerHTML = html;
    }

    selectBlueprint(blueprintId) {
        const blueprint = this.blueprints.find(b => b.id === blueprintId);
        if (!blueprint) return;

        this.currentBlueprint = blueprint;
        this.loadBlueprintViewer(blueprint);
        
        // Highlight selected blueprint
        document.querySelectorAll('.blueprint-item').forEach(item => {
            item.classList.remove('border-primary', 'bg-light');
        });
        event.target.closest('.blueprint-item')?.classList.add('border-primary', 'bg-light');
    }

    loadBlueprintViewer(blueprint) {
        const placeholder = document.getElementById('blueprintPlaceholder');
        const container = document.getElementById('blueprintImageContainer');
        const info = document.getElementById('blueprintInfo');
        const tools = document.getElementById('viewerTools');
        const toolbar = document.getElementById('blueprintToolbar');

        // Hide placeholder and show image container
        placeholder.style.display = 'none';
        container.style.display = 'block';
        info.style.display = 'block';
        tools.style.display = 'block';
        toolbar.style.display = 'block';

        // Update info display
        document.getElementById('blueprintFileName').textContent = blueprint.name;
        document.getElementById('blueprintScale').textContent = blueprint.scale || '1:100';
        document.getElementById('blueprintType').textContent = blueprint.type;

        // Load blueprint image (for demo, we'll use a placeholder)
        const img = document.getElementById('blueprintImage');
        
        if (blueprint.type === 'PDF') {
            // For PDF, we'd normally use PDF.js or convert to image
            img.src = this.createBlueprintPlaceholder(blueprint);
        } else {
            // For images, load directly (in real app, use blueprint.url)
            img.src = this.createBlueprintPlaceholder(blueprint);
        }

        img.onload = () => {
            this.initializeMeasurementTools();
            this.updateCanvasSize();
        };

        // Reset measurements and tool
        this.measurements = [];
        this.setTool('select');
        this.renderTakeoffItems();
    }

    createBlueprintPlaceholder(blueprint) {
        // Create a canvas with a realistic blueprint-looking placeholder
        const canvas = document.createElement('canvas');
        canvas.width = 1200;
        canvas.height = 800;
        const ctx = canvas.getContext('2d');

        // White background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw blueprint-like content
        ctx.strokeStyle = '#0066cc';
        ctx.lineWidth = 2;
        ctx.font = '24px Arial';
        ctx.fillStyle = '#0066cc';

        // Title block
        ctx.fillText(blueprint.name, 50, 50);
        ctx.font = '16px Arial';
        ctx.fillText(`Scale: ${blueprint.scale || '1:100'}`, 50, 80);
        ctx.fillText(`Type: ${blueprint.type}`, 50, 100);

        // Draw some blueprint-like shapes
        // Foundation outline
        ctx.beginPath();
        ctx.rect(100, 150, 800, 400);
        ctx.stroke();

        // Rooms
        ctx.beginPath();
        ctx.rect(120, 170, 200, 180);
        ctx.stroke();
        ctx.fillText('Living Room', 130, 260);

        ctx.beginPath();
        ctx.rect(340, 170, 180, 180);
        ctx.stroke();
        ctx.fillText('Kitchen', 350, 260);

        ctx.beginPath();
        ctx.rect(540, 170, 160, 180);
        ctx.stroke();
        ctx.fillText('Bedroom', 550, 260);

        // Dimensions
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        
        // Sample dimension line
        ctx.beginPath();
        ctx.moveTo(100, 130);
        ctx.lineTo(900, 130);
        ctx.stroke();
        ctx.fillStyle = '#ff0000';
        ctx.font = '12px Arial';
        ctx.fillText('40\'-0"', 480, 125);

        ctx.setLineDash([]);

        return canvas.toDataURL();
    }

    initializeMeasurementTools() {
        const canvas = document.getElementById('blueprintCanvas');
        if (!canvas) return;

        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        // Mouse event handlers
        canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        canvas.addEventListener('click', (e) => this.handleClick(e));
        
        // Touch event handlers for mobile
        canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e));
        canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e));
        canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e));
    }

    updateCanvasSize() {
        const img = document.getElementById('blueprintImage');
        const canvas = document.getElementById('blueprintCanvas');
        if (!img || !canvas) return;

        const container = img.parentElement;
        const rect = container.getBoundingClientRect();
        
        canvas.width = rect.width;
        canvas.height = rect.height;
        canvas.style.width = rect.width + 'px';
        canvas.style.height = rect.height + 'px';
        
        // Redraw existing measurements
        this.redrawMeasurements();
    }

    handleMouseDown(e) {
        if (this.currentTool === 'select') return;
        
        const rect = this.canvas.getBoundingClientRect();
        this.startPoint = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
        
        this.isDrawing = true;
        
        if (this.currentTool === 'area') {
            this.currentPath = [this.startPoint];
        }
    }

    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const currentPoint = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };

        // Update mouse coordinates display
        document.getElementById('mouseCoords').textContent = `${currentPoint.x.toFixed(0)}, ${currentPoint.y.toFixed(0)}`;

        if (!this.isDrawing) return;

        // Clear canvas and redraw existing measurements
        this.redrawMeasurements();

        // Draw current measurement
        this.ctx.strokeStyle = '#ff0000';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([]);

        if (this.currentTool === 'measure') {
            this.drawLine(this.startPoint, currentPoint);
            const distance = this.calculateRealDistance(this.startPoint, currentPoint);
            document.getElementById('currentMeasurement').textContent = `${distance.value.toFixed(2)} ${distance.unit}`;
        } else if (this.currentTool === 'area') {
            this.drawPolygon([...this.currentPath, currentPoint]);
        }
    }

    handleMouseUp(e) {
        if (!this.isDrawing) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const endPoint = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };

        this.isDrawing = false;
        
        if (this.currentTool === 'measure') {
            this.addLinearMeasurement(this.startPoint, endPoint);
        } else if (this.currentTool === 'area') {
            // Continue path for area measurement (double-click to finish)
            this.currentPath.push(endPoint);
        }
        
        document.getElementById('currentMeasurement').textContent = '-';
    }

    handleClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const clickPoint = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };

        if (this.currentTool === 'count') {
            this.addCountMeasurement(clickPoint);
        }
    }

    // Tool management
    setTool(toolName) {
        this.currentTool = toolName;
        
        // Update toolbar buttons
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.remove('active');
            const btnTool = btn.dataset.tool;
            if (btnTool) {
                btn.classList.toggle('btn-outline-primary', btnTool !== toolName);
                btn.classList.toggle('btn-primary', btnTool === toolName);
                btn.classList.toggle('active', btnTool === toolName);
            }
        });

        // Update tool display
        const toolNames = {
            select: 'Select',
            measure: 'Measure Distance',
            area: 'Measure Area',
            count: 'Count Items'
        };
        document.getElementById('currentToolDisplay').textContent = toolNames[toolName];

        // Update cursor
        const canvas = document.getElementById('blueprintCanvas');
        if (canvas) {
            const cursors = {
                select: 'default',
                measure: 'crosshair',
                area: 'crosshair',
                count: 'pointer'
            };
            canvas.style.cursor = cursors[toolName];
        }

        // Reset current drawing state
        this.isDrawing = false;
        this.currentPath = [];
    }

    // Measurement creation methods
    addLinearMeasurement(start, end) {
        const distance = this.calculateRealDistance(start, end);
        const measurement = {
            id: Date.now(),
            type: 'linear',
            start,
            end,
            distance: distance.value,
            unit: distance.unit,
            pixelDistance: Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2))
        };

        this.measurements.push(measurement);
        this.createTakeoffItem('Linear Measurement', distance.value, distance.unit, `${distance.value.toFixed(2)} ${distance.unit} measured`);
        this.redrawMeasurements();
    }

    addCountMeasurement(point) {
        const measurement = {
            id: Date.now(),
            type: 'count',
            point,
            count: 1
        };

        this.measurements.push(measurement);
        this.createTakeoffItem('Counted Item', 1, 'EA', `Item counted at position`);
        this.redrawMeasurements();
    }

    // Utility methods for measurements
    calculateRealDistance(start, end) {
        const pixelDistance = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
        
        // Convert pixels to real-world units based on current scale
        const realDistance = (pixelDistance * this.scale.realWorld) / this.scale.pixels;
        
        return {
            value: realDistance,
            unit: this.scale.unit,
            pixels: pixelDistance
        };
    }

    drawLine(start, end) {
        this.ctx.beginPath();
        this.ctx.moveTo(start.x, start.y);
        this.ctx.lineTo(end.x, end.y);
        this.ctx.stroke();
        
        // Draw dimension text
        const midX = (start.x + end.x) / 2;
        const midY = (start.y + end.y) / 2;
        const distance = this.calculateRealDistance(start, end);
        
        this.ctx.fillStyle = '#ff0000';
        this.ctx.font = '12px Arial';
        this.ctx.fillText(`${distance.value.toFixed(2)} ${distance.unit}`, midX + 5, midY - 5);
    }

    drawPolygon(points) {
        if (points.length < 2) return;
        
        this.ctx.beginPath();
        this.ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            this.ctx.lineTo(points[i].x, points[i].y);
        }
        this.ctx.stroke();
    }

    redrawMeasurements() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.measurements.forEach(measurement => {
            this.ctx.strokeStyle = '#0066cc';
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([]);
            
            if (measurement.type === 'linear') {
                this.drawLine(measurement.start, measurement.end);
            } else if (measurement.type === 'count') {
                // Draw count marker
                this.ctx.fillStyle = '#ff6600';
                this.ctx.beginPath();
                this.ctx.arc(measurement.point.x, measurement.point.y, 8, 0, 2 * Math.PI);
                this.ctx.fill();
                
                this.ctx.fillStyle = 'white';
                this.ctx.font = 'bold 12px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(measurement.count.toString(), measurement.point.x, measurement.point.y + 3);
            }
        });
    }

    createTakeoffItem(name, quantity, unit, notes) {
        const item = {
            id: Date.now() + Math.random(),
            name,
            quantity,
            unit,
            notes,
            blueprint: this.currentBlueprint?.name || 'Unknown',
            timestamp: new Date().toLocaleString()
        };

        this.takeoffItems.push(item);
        this.renderTakeoffItems();
        this.updateSendButton();
    }

    renderTakeoffItems() {
        const container = document.getElementById('activeTakeoffItems');
        if (!this.takeoffItems || this.takeoffItems.length === 0) {
            container.innerHTML = `
                <div class="text-center text-muted py-3">
                    <i class="bi bi-rulers fs-3 d-block mb-2"></i>
                    <small>Start measuring to create takeoff items</small>
                </div>
            `;
            return;
        }

        const html = this.takeoffItems.map(item => `
            <div class="border rounded p-2 mb-2 bg-white">
                <div class="d-flex justify-content-between align-items-start">
                    <div class="flex-grow-1">
                        <strong class="text-primary">${item.name}</strong>
                        <div class="small text-muted">${item.notes}</div>
                        <div class="mt-1">
                            <span class="badge bg-light text-dark">${item.quantity} ${item.unit}</span>
                            <span class="badge bg-info text-white ms-1">${item.blueprint}</span>
                        </div>
                    </div>
                    <button class="btn btn-sm btn-outline-danger" onclick="blueprintManager.removeTakeoffItem('${item.id}')">
                        <i class="bi bi-x"></i>
                    </button>
                </div>
            </div>
        `).join('');

        container.innerHTML = html;
    }

    updateSendButton() {
        const btn = document.getElementById('sendToEstimatingBtn');
        if (this.takeoffItems.length > 0) {
            btn.disabled = false;
            btn.innerHTML = `<i class="bi bi-calculator"></i> Create Estimate (${this.takeoffItems.length})`;
        } else {
            btn.disabled = true;
            btn.innerHTML = `<i class="bi bi-calculator"></i> Create Estimate`;
        }
    }

    removeTakeoffItem(itemId) {
        this.takeoffItems = this.takeoffItems.filter(item => item.id !== itemId);
        
        // Also remove associated measurement
        this.measurements = this.measurements.filter(m => m.id !== itemId);
        
        this.renderTakeoffItems();
        this.updateSendButton();
        this.redrawMeasurements();
    }

    clearMeasurements() {
        this.measurements = [];
        this.takeoffItems = [];
        this.renderTakeoffItems();
        this.updateSendButton();
        this.redrawMeasurements();
    }

    undoLastMeasurement() {
        if (this.measurements.length > 0) {
            this.measurements.pop();
        }
        if (this.takeoffItems.length > 0) {
            this.takeoffItems.pop();
        }
        this.renderTakeoffItems();
        this.updateSendButton();
        this.redrawMeasurements();
    }

    // Scale and viewing controls
    setScale() {
        const modalHtml = `
            <div class="modal fade" id="setScaleModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Set Blueprint Scale</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <p>To set the scale accurately:</p>
                            <ol>
                                <li>Find a dimension line on the blueprint with a known measurement</li>
                                <li>Enter the pixel length and real-world measurement below</li>
                            </ol>
                            <div class="row">
                                <div class="col-6 mb-3">
                                    <label class="form-label">Pixel Distance</label>
                                    <input type="number" class="form-control" id="pixelDistance" value="${this.scale.pixels}" step="0.1">
                                </div>
                                <div class="col-6 mb-3">
                                    <label class="form-label">Real Distance</label>
                                    <input type="number" class="form-control" id="realDistance" value="${this.scale.realWorld}" step="0.1">
                                </div>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Unit</label>
                                <select class="form-select" id="scaleUnit">
                                    <option value="ft" ${this.scale.unit === 'ft' ? 'selected' : ''}>Feet</option>
                                    <option value="in" ${this.scale.unit === 'in' ? 'selected' : ''}>Inches</option>
                                    <option value="m" ${this.scale.unit === 'm' ? 'selected' : ''}>Meters</option>
                                    <option value="cm" ${this.scale.unit === 'cm' ? 'selected' : ''}>Centimeters</option>
                                </select>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-primary" onclick="blueprintManager.applyScale()">Apply Scale</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const existingModal = document.getElementById('setScaleModal');
        if (existingModal) existingModal.remove();

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modal = new bootstrap.Modal(document.getElementById('setScaleModal'));
        modal.show();
    }

    applyScale() {
        const pixels = parseFloat(document.getElementById('pixelDistance').value) || 100;
        const realWorld = parseFloat(document.getElementById('realDistance').value) || 10;
        const unit = document.getElementById('scaleUnit').value;

        this.scale = { pixels, realWorld, unit };
        
        document.getElementById('currentScale').textContent = `${pixels}px = ${realWorld}${unit}`;
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('setScaleModal'));
        modal.hide();
        
        this.showAlert('success', 'Scale updated successfully!');
    }

    zoomIn() {
        const img = document.getElementById('blueprintImage');
        const currentWidth = img.offsetWidth;
        img.style.width = (currentWidth * 1.25) + 'px';
        this.updateCanvasSize();
    }

    zoomOut() {
        const img = document.getElementById('blueprintImage');
        const currentWidth = img.offsetWidth;
        img.style.width = (currentWidth * 0.8) + 'px';
        this.updateCanvasSize();
    }

    zoomToFit() {
        const img = document.getElementById('blueprintImage');
        img.style.width = '100%';
        img.style.height = '100%';
        this.updateCanvasSize();
    }

    resetView() {
        this.zoomToFit();
        this.clearMeasurements();
        this.setTool('select');
    }

    showUploadModal() {
        if (!document.getElementById('uploadBlueprintModal')) {
            this.injectUploadModal();
        }
        const modal = new bootstrap.Modal(document.getElementById('uploadBlueprintModal'));
        modal.show();
    }

    injectUploadModal() {
        const modalHtml = `
            <div class="modal fade" id="uploadBlueprintModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content border-0 shadow-lg">
                        <div class="modal-header bg-primary text-white py-3">
                            <h5 class="modal-title fw-bold"><i class="bi bi-cloud-upload me-2"></i> Upload Project Blueprints</h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body p-4">
                            <form id="uploadBlueprintForm">
                                <div class="mb-4">
                                    <label class="form-label fw-bold">Select Project</label>
                                    <input type="text" class="form-control" id="projectName" value="${this.currentProject ? this.currentProject.name : ''}" readonly>
                                </div>
                                <div class="upload-zone p-5 border-2 border-dashed rounded-3 text-center mb-4 bg-light" id="blueprintDropZone">
                                    <i class="bi bi-file-earmark-pdf display-4 text-muted mb-3"></i>
                                    <h5>Drag and drop PDF blueprints here</h5>
                                    <p class="text-muted">or click to browse from your computer</p>
                                    <input type="file" id="blueprintFiles" class="d-none" multiple accept=".pdf,image/*">
                                    <button type="button" class="btn btn-outline-primary mt-2" onclick="document.getElementById('blueprintFiles').click()">Browse Files</button>
                                </div>
                                <div class="row mb-4">
                                    <div class="col-md-6">
                                        <label class="form-label fw-bold">Default Scale</label>
                                        <select class="form-select" id="blueprintDefaultScale">
                                            <option value="1/4">1/4" = 1'-0"</option>
                                            <option value="1/8">1/8" = 1'-0"</option>
                                            <option value="1/16">1/16" = 1'-0"</option>
                                            <option value="custom">Custom Scale</option>
                                        </select>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label fw-bold">Document Category</label>
                                        <select class="form-select" id="blueprintCategory">
                                            <option value="architectural">Architectural</option>
                                            <option value="structural">Structural</option>
                                            <option value="mechanical">Mechanical</option>
                                            <option value="electrical">Electrical</option>
                                            <option value="plumbing">Plumbing</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="mb-4">
                                    <label class="form-label fw-bold">Internal Notes</label>
                                    <textarea class="form-control" id="blueprintNotes" rows="3" placeholder="Add any specific instructions for the takeoff team..."></textarea>
                                </div>
                                <div id="uploadProgress" class="progress mb-4" style="display: none; height: 10px;">
                                    <div class="progress-bar progress-bar-striped progress-bar-animated" role="progressbar" style="width: 0%"></div>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer bg-light py-3">
                            <button type="button" class="btn btn-white border px-4" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-primary px-4" onclick="blueprintManager.uploadBlueprints()">
                                <i class="bi bi-cloud-arrow-up me-1"></i> Start Upload
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    async uploadBlueprints() {
        const files = document.getElementById('blueprintFiles').files;
        const projectName = document.getElementById('projectName').value;
        
        if (!files || files.length === 0) {
            alert('Please select at least one blueprint file');
            return;
        }

        const progressBar = document.querySelector('#uploadProgress .progress-bar');
        document.getElementById('uploadProgress').style.display = 'block';

        try {
            const formData = new FormData();
            formData.append('project_name', projectName || 'Untitled Project');
            formData.append('scale', document.getElementById('blueprintDefaultScale').value);
            formData.append('notes', document.getElementById('blueprintNotes').value);
            
            // Add each file to form data
            for (let i = 0; i < files.length; i++) {
                formData.append('files', files[i]);
            }

            // Simulate upload progress
            for (let i = 0; i <= 100; i += 20) {
                progressBar.style.width = i + '%';
                await new Promise(resolve => setTimeout(resolve, 150));
            }

            // Try API first
            try {
                const response = await fetch('/api/blueprints/upload', {
                    method: 'POST',
                    body: formData
                });

                if (response.ok) {
                    const result = await response.json();
                    this.showAlert('success', `${result.uploaded_files.length} blueprint(s) uploaded successfully!`);
                    const modal = bootstrap.Modal.getInstance(document.getElementById('uploadBlueprintModal'));
                    modal.hide();
                    await this.loadBlueprints();
                    return;
                }
            } catch (apiError) {
                console.warn('API upload failed, falling back to local simulation');
            }

            // Fallback: Local simulation for demo purposes
            const newBlueprints = [];
            for (let i = 0; i < files.length; i++) {
                newBlueprints.push({
                    id: Date.now() + i,
                    project_id: this.currentProject ? this.currentProject.id : 0,
                    name: files[i].name,
                    category: document.getElementById('blueprintCategory').value,
                    scale: document.getElementById('blueprintDefaultScale').value,
                    uploaded_date: new Date().toISOString(),
                    thumbnail: 'https://via.placeholder.com/150?text=Blueprint'
                });
            }

            if (window.dataManager) {
                window.dataManager.data.blueprints.push(...newBlueprints);
                window.dataManager.saveData('blueprints');
                
                this.showAlert('success', `${newBlueprints.length} blueprint(s) added to project (Local Storage)`);
                const modal = bootstrap.Modal.getInstance(document.getElementById('uploadBlueprintModal'));
                if (modal) modal.hide();
                this.refreshProjectBlueprints();
            }
        } catch (error) {
            console.error('Upload failed:', error);
            this.showAlert('danger', 'Failed to upload blueprints: ' + error.message);
        }
    }

    // Send takeoff items to estimating module
    sendToEstimating() {
        if (!this.takeoffItems || this.takeoffItems.length === 0) {
            alert('No takeoff items to send. Create some measurements first.');
            return;
        }

        // Convert blueprint takeoff items to estimating format
        const blueprintMeasurements = this.takeoffItems.map(item => ({
            id: item.id,
            item: item.name,
            measurement: `${item.quantity} ${item.unit}`,
            quantity: item.quantity,
            unit: item.unit,
            notes: item.notes,
            blueprint: item.blueprint
        }));

        // Store for the estimating module
        localStorage.setItem('blueprintMeasurements', JSON.stringify(blueprintMeasurements));
        
        // Switch to estimating module
        window.app.loadModule('takeoff');
        
        this.showAlert('success', `${this.takeoffItems.length} takeoff items sent to estimating!`);
    }

    filterBlueprints(searchTerm) {
        const items = document.querySelectorAll('.blueprint-item');
        items.forEach(item => {
            const text = item.textContent.toLowerCase();
            item.style.display = text.includes(searchTerm.toLowerCase()) ? 'block' : 'none';
        });
    }

    // Touch event handlers for mobile support
    handleTouchStart(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousedown', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        this.handleMouseDown(mouseEvent);
    }

    handleTouchMove(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousemove', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        this.handleMouseMove(mouseEvent);
    }

    handleTouchEnd(e) {
        e.preventDefault();
        const mouseEvent = new MouseEvent('mouseup', {});
        this.handleMouseUp(mouseEvent);
    }

    showAlert(type, message) {
        // Use the app's alert system if available
        if (window.app && window.app.showAlert) {
            window.app.showAlert(type, message);
        } else {
            alert(message);
        }
    }
}

// Initialize blueprint manager
window.blueprintManager = new BlueprintManager();