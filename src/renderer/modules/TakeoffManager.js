// Takeoff & Estimating Manager - Lightning-fast takeoff and complete estimating
class TakeoffManager {
    constructor() {
        this.currentProject = null;
        this.takeoffItems = [];
        this.selectedIndustry = null;
        this.materials = [];
        this.laborRates = [];
        this.markup = {
            overhead: 15,
            profit: 10,
            tax: 8.5
        };
        this.init();
    }

    init() {
        console.log('TakeoffManager initialized');
        this.setupProjectListeners();
    }

    setupProjectListeners() {
        // Listen for project selection changes
        window.addEventListener('projectSelected', (event) => {
            this.setCurrentProject(event.detail.project);
        });

        // Listen for data changes
        window.addEventListener('dataChanged', (event) => {
            if (event.detail.dataType === 'projects') {
                this.refreshProjectContext();
            }
        });
    }

    setCurrentProject(project) {
        this.currentProject = project;
        console.log('TakeoffManager: Current project set to:', project?.name);
        this.refreshProjectContext();
    }

    refreshProjectContext() {
        // Update UI to show current project context
        if (this.currentProject && document.getElementById('mainContent').innerHTML.includes('Takeoff & Estimating')) {
            this.updateProjectHeader();
        }
    }

    updateProjectHeader() {
        // Update the project header in the current interface
        if (this.currentProject) {
            this.showTakeoffInterface();
        }
    }

    createFromBlueprint(blueprintId) {
        if (window.dataManager) {
            const blueprint = window.dataManager.data.blueprints.find(b => b.id == blueprintId);
            if (blueprint) {
                // Set project context from blueprint
                if (blueprint.project_id) {
                    const project = window.dataManager.data.projects.find(p => p.id == blueprint.project_id);
                    if (project) {
                        this.setCurrentProject(project);
                    }
                }
                
                // Create new takeoff with blueprint reference
                this.startNewTakeoff();
                
                // Pre-populate with blueprint info
                setTimeout(() => {
                    const nameInput = document.getElementById('takeoffName');
                    if (nameInput) {
                        nameInput.value = `Takeoff from ${blueprint.name}`;
                    }
                }, 500);
                
                console.log('Creating takeoff from blueprint:', blueprint.name);
            }
        }
    }

    // Main Takeoff & Estimating Interface
    showTakeoffInterface() {
        const currentProjectHeader = this.currentProject ? `
            <div class="alert alert-info mb-3">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <strong><i class="bi bi-building"></i> Current Project: ${this.currentProject.name}</strong>
                        <br><small>${this.currentProject.type} • ${this.currentProject.status} • Budget: $${parseFloat(this.currentProject.budget || 0).toLocaleString()}</small>
                    </div>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" onclick="app.shareProject(${this.currentProject.id}, 'email')" title="Email Project">
                            <i class="bi bi-envelope"></i>
                        </button>
                        <button class="btn btn-outline-primary" onclick="app.shareProject(${this.currentProject.id}, 'print')" title="Print Project">
                            <i class="bi bi-printer"></i>
                        </button>
                        <button class="btn btn-outline-info" onclick="app.viewProject(${this.currentProject.id})" title="View Full Project">
                            <i class="bi bi-eye"></i>
                        </button>
                    </div>
                </div>
            </div>
        ` : `
            <div class="alert alert-warning mb-3">
                <i class="bi bi-exclamation-triangle"></i> 
                <strong>No project selected.</strong> 
                <a href="#" onclick="app.loadModule('projects')" class="alert-link">Select a project</a> to create integrated takeoffs and estimates.
            </div>
        `;

        const content = `
            ${currentProjectHeader}
            <div class="row mb-4">
                <div class="col-12">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h2><i class="bi bi-calculator-fill text-primary"></i> Takeoff & Estimating</h2>
                            <p class="text-muted mb-0">Lightning-fast takeoff and complete estimating in one solution</p>
                        </div>
                        <div class="btn-group">
                            <button class="btn btn-primary" onclick="takeoffManager.startNewTakeoff()">
                                <i class="bi bi-plus-circle"></i> New Takeoff
                            </button>
                            <button class="btn btn-outline-primary" onclick="takeoffManager.loadTemplate()">
                                <i class="bi bi-file-earmark-text"></i> Load Template
                            </button>
                            <button class="btn btn-outline-success" onclick="takeoffManager.showProposalGenerator()">
                                <i class="bi bi-file-earmark-pdf"></i> Generate Proposal
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Industry-Specific Materials & Labor Panel -->
            <div class="row mb-4">
                <div class="col-md-4">
                    <div class="card shadow-sm">
                        <div class="card-header bg-primary text-white">
                            <h6 class="mb-0"><i class="bi bi-hammer"></i> Materials Database</h6>
                        </div>
                        <div class="card-body">
                            <div class="mb-3">
                                <input type="text" class="form-control" id="materialSearch" placeholder="Search materials..." onkeyup="takeoffManager.filterMaterials(this.value)">
                            </div>
                            <div class="materials-list" id="materialsList" style="max-height: 400px; overflow-y: auto;">
                                <div class="text-center text-muted">
                                    <i class="bi bi-info-circle"></i>
                                    <p>Select an industry to view materials</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="col-md-4">
                    <div class="card shadow-sm">
                        <div class="card-header bg-success text-white">
                            <h6 class="mb-0"><i class="bi bi-people-fill"></i> Labor Categories</h6>
                        </div>
                        <div class="card-body">
                            <div class="mb-3">
                                <input type="text" class="form-control" id="laborSearch" placeholder="Search labor..." onkeyup="takeoffManager.filterLabor(this.value)">
                            </div>
                            <div class="labor-list" id="laborList" style="max-height: 400px; overflow-y: auto;">
                                <div class="text-center text-muted">
                                    <i class="bi bi-info-circle"></i>
                                    <p>Select an industry to view labor rates</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="col-md-4">
                    <div class="card shadow-sm">
                        <div class="card-header bg-info text-white">
                            <h6 class="mb-0"><i class="bi bi-clipboard-check"></i> Quick Takeoff Templates</h6>
                        </div>
                        <div class="card-body">
                            <div id="templatesList">
                                <div class="text-center text-muted">
                                    <i class="bi bi-download"></i>
                                    <p>Loading templates...</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Current Takeoff/Estimate Workspace -->
            <div class="row">
                <div class="col-12">
                    <div class="card shadow">
                        <div class="card-header d-flex justify-content-between align-items-center">
                            <h6 class="mb-0"><i class="bi bi-list-ul"></i> Current Estimate</h6>
                            <div class="btn-group btn-group-sm">
                                <button class="btn btn-outline-primary" onclick="takeoffManager.calculateTotals()">
                                    <i class="bi bi-calculator"></i> Calculate
                                </button>
                                <button class="btn btn-outline-success" onclick="takeoffManager.saveEstimate()">
                                    <i class="bi bi-floppy"></i> Save
                                </button>
                                <button class="btn btn-outline-info" onclick="takeoffManager.exportEstimate()">
                                    <i class="bi bi-file-earmark-excel"></i> Export
                                </button>
                            </div>
                        </div>
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-hover">
                                    <thead class="table-light">
                                        <tr>
                                            <th width="30%">Item Description</th>
                                            <th width="10%">Quantity</th>
                                            <th width="10%">Unit</th>
                                            <th width="15%">Unit Cost</th>
                                            <th width="15%">Total Cost</th>
                                            <th width="10%">Category</th>
                                            <th width="10%">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody id="takeoffItemsTable">
                                        <tr>
                                            <td colspan="7" class="text-center text-muted py-4">
                                                <i class="bi bi-plus-circle fs-2 d-block mb-2"></i>
                                                Start by adding materials or labor from the panels above
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div class="card-footer">
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="row">
                                        <div class="col-4">
                                            <label class="form-label">Overhead (%)</label>
                                            <input type="number" class="form-control" id="overheadPercent" value="15" onchange="takeoffManager.updateMarkup()">
                                        </div>
                                        <div class="col-4">
                                            <label class="form-label">Profit (%)</label>
                                            <input type="number" class="form-control" id="profitPercent" value="10" onchange="takeoffManager.updateMarkup()">
                                        </div>
                                        <div class="col-4">
                                            <label class="form-label">Tax (%)</label>
                                            <input type="number" class="form-control" id="taxPercent" value="8.5" onchange="takeoffManager.updateMarkup()">
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="text-end">
                                        <table class="table table-sm ms-auto" style="width: auto;">
                                            <tr>
                                                <td><strong>Subtotal:</strong></td>
                                                <td class="text-end"><span id="subtotalAmount">$0.00</span></td>
                                            </tr>
                                            <tr>
                                                <td>Overhead (<span id="overheadDisplay">15</span>%):</td>
                                                <td class="text-end"><span id="overheadAmount">$0.00</span></td>
                                            </tr>
                                            <tr>
                                                <td>Profit (<span id="profitDisplay">10</span>%):</td>
                                                <td class="text-end"><span id="profitAmount">$0.00</span></td>
                                            </tr>
                                            <tr>
                                                <td>Tax (<span id="taxDisplay">8.5</span>%):</td>
                                                <td class="text-end"><span id="taxAmount">$0.00</span></td>
                                            </tr>
                                            <tr class="table-primary">
                                                <td><strong>Total:</strong></td>
                                                <td class="text-end"><strong><span id="totalAmount">$0.00</span></strong></td>
                                            </tr>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('mainContent').innerHTML = content;
        this.loadTemplates();
        this.loadIndustryData();
        this.setupEventListeners();
        this.checkForBlueprintMeasurements();
    }

    setupEventListeners() {
        // Material and labor search will be handled by onkeyup events
        console.log('Takeoff event listeners set up');
    }

    async loadIndustryData() {
        const selectedIndustry = localStorage.getItem('selectedIndustry');
        if (selectedIndustry) {
            this.selectedIndustry = selectedIndustry;
            await this.loadMaterials(selectedIndustry);
            await this.loadLaborRates(selectedIndustry);
        }
    }

    async loadMaterials(industryId) {
        try {
            const response = await fetch(`/api/materials?industry=${industryId}`);
            this.materials = await response.json();
            this.renderMaterials();
        } catch (error) {
            console.error('Failed to load materials:', error);
        }
    }

    async loadLaborRates(industryId) {
        try {
            const response = await fetch(`/api/labor?industry=${industryId}`);
            this.laborRates = await response.json();
            this.renderLaborRates();
        } catch (error) {
            console.error('Failed to load labor rates:', error);
        }
    }

    async loadTemplates() {
        try {
            const response = await fetch('/api/takeoff-templates');
            const templates = await response.json();
            this.renderTemplates(templates);
        } catch (error) {
            console.error('Failed to load templates:', error);
        }
    }

    renderMaterials() {
        const container = document.getElementById('materialsList');
        if (!this.materials || this.materials.length === 0) {
            container.innerHTML = '<div class="text-center text-muted"><p>No materials found for selected industry</p></div>';
            return;
        }

        const html = this.materials.map(material => `
            <div class="material-item border-bottom py-2" data-id="${material.id}">
                <div class="d-flex justify-content-between align-items-start">
                    <div class="flex-grow-1">
                        <h6 class="mb-1">${material.name}</h6>
                        <small class="text-muted">${material.category}</small>
                    </div>
                    <div class="text-end">
                        <div class="fw-bold">$${material.cost.toFixed(2)}/${material.unit}</div>
                        <button class="btn btn-sm btn-outline-primary mt-1" onclick="takeoffManager.addMaterial(${material.id})">
                            <i class="bi bi-plus-circle"></i> Add
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
        
        container.innerHTML = html;
    }

    renderLaborRates() {
        const container = document.getElementById('laborList');
        if (!this.laborRates || this.laborRates.length === 0) {
            container.innerHTML = '<div class="text-center text-muted"><p>No labor rates found for selected industry</p></div>';
            return;
        }

        const html = this.laborRates.map(labor => `
            <div class="labor-item border-bottom py-2" data-id="${labor.id}">
                <div class="d-flex justify-content-between align-items-start">
                    <div class="flex-grow-1">
                        <h6 class="mb-1">${labor.task}</h6>
                        <small class="text-muted">${labor.category}</small>
                    </div>
                    <div class="text-end">
                        <div class="fw-bold">$${labor.rate.toFixed(2)}/hr</div>
                        <button class="btn btn-sm btn-outline-success mt-1" onclick="takeoffManager.addLabor(${labor.id})">
                            <i class="bi bi-plus-circle"></i> Add
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
        
        container.innerHTML = html;
    }

    renderTemplates(templates) {
        const container = document.getElementById('templatesList');
        if (!templates || templates.length === 0) {
            container.innerHTML = '<div class="text-center text-muted"><p>No templates available</p></div>';
            return;
        }

        const html = templates.map(template => `
            <div class="template-item border rounded p-3 mb-2 hover-shadow" style="cursor: pointer;" onclick="takeoffManager.applyTemplate(${template.id})">
                <h6 class="mb-1">${template.name}</h6>
                <small class="text-muted">${template.category}</small>
                <div class="mt-2">
                    ${template.items.map(item => `<span class="badge bg-light text-dark me-1">${item}</span>`).join('')}
                </div>
            </div>
        `).join('');
        
        container.innerHTML = html;
    }

    addMaterial(materialId) {
        const material = this.materials.find(m => m.id === materialId);
        if (!material) return;

        // Show quantity input modal
        this.showQuantityModal(material, 'material');
    }

    addLabor(laborId) {
        const labor = this.laborRates.find(l => l.id === laborId);
        if (!labor) return;

        // Show hours input modal
        this.showQuantityModal(labor, 'labor');
    }

    showQuantityModal(item, type) {
        const isLabor = type === 'labor';
        const unitLabel = isLabor ? 'Hours' : `Quantity (${item.unit || 'EA'})`;
        const rateLabel = isLabor ? `$${item.rate}/hr` : `$${item.cost}/${item.unit || 'EA'}`;
        
        const modalHtml = `
            <div class="modal fade" id="quantityInputModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Add ${isLabor ? 'Labor' : 'Material'}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="mb-3">
                                <h6>${isLabor ? item.task : item.name}</h6>
                                <p class="text-muted">${item.category} • ${rateLabel}</p>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">${unitLabel}:</label>
                                <input type="number" class="form-control" id="itemQuantityInput" step="0.01" min="0" value="1" required>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Total Cost:</label>
                                <div class="fs-4 fw-bold text-primary" id="modalTotalCost">$${(isLabor ? item.rate : item.cost).toFixed(2)}</div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-primary" onclick="takeoffManager.confirmAddItem(${item.id}, '${type}')">Add to Estimate</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if any
        const existingModal = document.getElementById('quantityInputModal');
        if (existingModal) {
            existingModal.remove();
        }

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        const modal = new bootstrap.Modal(document.getElementById('quantityInputModal'));
        modal.show();

        // Update total on quantity change
        document.getElementById('itemQuantityInput').addEventListener('input', (e) => {
            const quantity = parseFloat(e.target.value) || 0;
            const rate = isLabor ? item.rate : item.cost;
            const total = quantity * rate;
            document.getElementById('modalTotalCost').textContent = `$${total.toFixed(2)}`;
        });
    }

    confirmAddItem(itemId, type) {
        const quantity = parseFloat(document.getElementById('itemQuantityInput').value) || 0;
        if (quantity <= 0) {
            alert('Please enter a valid quantity');
            return;
        }

        const isLabor = type === 'labor';
        const sourceItem = isLabor 
            ? this.laborRates.find(l => l.id === itemId)
            : this.materials.find(m => m.id === itemId);

        if (!sourceItem) return;

        const takeoffItem = {
            id: Date.now() + Math.random(),
            name: isLabor ? sourceItem.task : sourceItem.name,
            quantity: quantity,
            unit: isLabor ? 'HR' : sourceItem.unit,
            unitCost: isLabor ? sourceItem.rate : sourceItem.cost,
            totalCost: quantity * (isLabor ? sourceItem.rate : sourceItem.cost),
            category: sourceItem.category,
            type: type
        };

        this.takeoffItems.push(takeoffItem);
        this.renderTakeoffItems();
        this.calculateTotals();

        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('quantityInputModal'));
        modal.hide();
    }

    renderTakeoffItems() {
        const tbody = document.getElementById('takeoffItemsTable');
        if (!this.takeoffItems || this.takeoffItems.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-muted py-4">
                        <i class="bi bi-plus-circle fs-2 d-block mb-2"></i>
                        Start by adding materials or labor from the panels above
                    </td>
                </tr>
            `;
            return;
        }

        const html = this.takeoffItems.map(item => `
            <tr>
                <td>
                    <div class="fw-bold">${item.name}</div>
                    <small class="text-muted">${item.type}</small>
                </td>
                <td>${item.quantity}</td>
                <td>${item.unit}</td>
                <td>$${item.unitCost.toFixed(2)}</td>
                <td class="fw-bold">$${item.totalCost.toFixed(2)}</td>
                <td><span class="badge bg-info">${item.category}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline-danger" onclick="takeoffManager.removeItem(${item.id})">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');

        tbody.innerHTML = html;
    }

    removeItem(itemId) {
        this.takeoffItems = this.takeoffItems.filter(item => item.id !== itemId);
        this.renderTakeoffItems();
        this.calculateTotals();
    }

    calculateTotals() {
        const subtotal = this.takeoffItems.reduce((sum, item) => sum + item.totalCost, 0);
        const overhead = subtotal * (this.markup.overhead / 100);
        const profit = subtotal * (this.markup.profit / 100);
        const tax = (subtotal + overhead + profit) * (this.markup.tax / 100);
        const total = subtotal + overhead + profit + tax;

        document.getElementById('subtotalAmount').textContent = `$${subtotal.toFixed(2)}`;
        document.getElementById('overheadAmount').textContent = `$${overhead.toFixed(2)}`;
        document.getElementById('profitAmount').textContent = `$${profit.toFixed(2)}`;
        document.getElementById('taxAmount').textContent = `$${tax.toFixed(2)}`;
        document.getElementById('totalAmount').textContent = `$${total.toFixed(2)}`;
    }

    updateMarkup() {
        this.markup.overhead = parseFloat(document.getElementById('overheadPercent').value) || 0;
        this.markup.profit = parseFloat(document.getElementById('profitPercent').value) || 0;
        this.markup.tax = parseFloat(document.getElementById('taxPercent').value) || 0;

        document.getElementById('overheadDisplay').textContent = this.markup.overhead;
        document.getElementById('profitDisplay').textContent = this.markup.profit;
        document.getElementById('taxDisplay').textContent = this.markup.tax;

        this.calculateTotals();
    }

    filterMaterials(searchTerm) {
        const items = document.querySelectorAll('.material-item');
        items.forEach(item => {
            const text = item.textContent.toLowerCase();
            item.style.display = text.includes(searchTerm.toLowerCase()) ? 'block' : 'none';
        });
    }

    filterLabor(searchTerm) {
        const items = document.querySelectorAll('.labor-item');
        items.forEach(item => {
            const text = item.textContent.toLowerCase();
            item.style.display = text.includes(searchTerm.toLowerCase()) ? 'block' : 'none';
        });
    }

    startNewTakeoff() {
        if (this.takeoffItems.length > 0) {
            if (!confirm('This will clear your current estimate. Continue?')) {
                return;
            }
        }
        this.takeoffItems = [];
        this.renderTakeoffItems();
        this.calculateTotals();
    }

    async saveEstimate() {
        if (this.takeoffItems.length === 0) {
            alert('Add some items to your estimate first');
            return;
        }

        const estimate = {
            items: this.takeoffItems,
            markup: this.markup,
            totals: this.getTotals(),
            created: new Date().toISOString()
        };

        try {
            const response = await fetch('/api/estimates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(estimate)
            });
            
            const result = await response.json();
            if (result.success) {
                alert('Estimate saved successfully!');
            }
        } catch (error) {
            console.error('Failed to save estimate:', error);
            alert('Failed to save estimate');
        }
    }

    getTotals() {
        const subtotal = this.takeoffItems.reduce((sum, item) => sum + item.totalCost, 0);
        const overhead = subtotal * (this.markup.overhead / 100);
        const profit = subtotal * (this.markup.profit / 100);
        const tax = (subtotal + overhead + profit) * (this.markup.tax / 100);
        const total = subtotal + overhead + profit + tax;

        return { subtotal, overhead, profit, tax, total };
    }

    exportEstimate() {
        alert('Export functionality coming soon!');
    }

    showProposalGenerator() {
        alert('Proposal generator coming soon!');
    }

    loadTemplate() {
        alert('Template loader coming soon!');
    }

    applyTemplate(templateId) {
        alert(`Applying template ${templateId} - coming soon!`);
    }

    checkForBlueprintMeasurements() {
        const blueprintMeasurements = localStorage.getItem('blueprintMeasurements');
        if (blueprintMeasurements) {
            const measurements = JSON.parse(blueprintMeasurements);
            if (measurements.length > 0) {
                this.importBlueprintMeasurements(measurements);
                // Clear the stored measurements after import
                localStorage.removeItem('blueprintMeasurements');
            }
        }
    }

    importBlueprintMeasurements(measurements) {
        measurements.forEach(measurement => {
            const takeoffItem = {
                id: Date.now() + Math.random(),
                name: `${measurement.item} (from blueprint)`,
                quantity: measurement.quantity,
                unit: measurement.unit,
                unitCost: this.getEstimatedCost(measurement.item, measurement.unit),
                totalCost: 0, // Will be calculated
                category: 'Blueprint Measurement',
                type: 'measurement',
                blueprint: measurement.blueprint,
                notes: measurement.notes
            };
            
            takeoffItem.totalCost = takeoffItem.quantity * takeoffItem.unitCost;
            this.takeoffItems.push(takeoffItem);
        });

        this.renderTakeoffItems();
        this.calculateTotals();
        
        if (window.app && window.app.showAlert) {
            window.app.showAlert('success', `Imported ${measurements.length} measurements from blueprints!`);
        } else {
            alert(`Imported ${measurements.length} measurements from blueprints!`);
        }
    }

    getEstimatedCost(item, unit) {
        // Provide estimated costs for blueprint measurements
        const costEstimates = {
            'Linear Measurement': { 'LF': 2.50, 'SF': 1.25, 'CF': 8.50 },
            'Area Measurement': { 'SF': 3.75, 'CF': 12.50 },
            'Volume Measurement': { 'CF': 15.00, 'CY': 125.00 }
        };
        
        return costEstimates[item]?.[unit] || 5.00; // Default cost
    }
}

// Initialize takeoff manager
const takeoffManager = new TakeoffManager();