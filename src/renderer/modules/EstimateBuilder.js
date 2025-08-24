// Estimate Builder Module
class EstimateBuilder {
    constructor() {
        this.estimate = {
            id: null,
            client_id: null,
            project_id: null,
            project_name: '',
            items: [],
            subtotal: 0,
            markup_percentage: 15, // Default 15% markup
            total_amount: 0,
            status: 'draft',
            notes: ''
        };
        this.currentProject = null;
        this.init();
    }

    init() {
        console.log('EstimateBuilder initialized');
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
        if (project) {
            this.estimate.project_id = project.id;
            this.estimate.project_name = project.name;
            this.estimate.client_id = project.client_id;
        }
        console.log('EstimateBuilder: Current project set to:', project?.name);
    }

    createFromTakeoff(takeoffId) {
        if (window.dataManager) {
            const takeoff = window.dataManager.data.takeoffs.find(t => t.id == takeoffId);
            if (takeoff) {
                // Pre-populate estimate with takeoff data
                this.estimate.project_id = takeoff.project_id;
                this.estimate.project_name = takeoff.project_name || 'Project from Takeoff';
                
                // Convert takeoff quantities to estimate items
                const estimateItems = [{
                    description: takeoff.name,
                    quantity: takeoff.total_quantity,
                    unit: takeoff.unit,
                    unit_cost: takeoff.estimated_cost || 0,
                    total_cost: (takeoff.total_quantity * (takeoff.estimated_cost || 0))
                }];
                
                this.estimate.items = estimateItems;
                this.calculateTotals();
                this.showCreateEstimateModal();
            }
        }
    }

    showCreateEstimateModal() {
        const modalHtml = `
            <div class="modal fade" id="createEstimateModal" tabindex="-1" data-bs-backdrop="static">
                <div class="modal-dialog modal-xl">
                    <div class="modal-content">
                        <div class="modal-header bg-primary text-white">
                            <h5 class="modal-title">
                                <i class="bi bi-calculator"></i> Create New Estimate
                            </h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="row">
                                <div class="col-md-8">
                                    <!-- Estimate Details -->
                                    <div class="card mb-3">
                                        <div class="card-header">
                                            <h6 class="mb-0">Project Information</h6>
                                        </div>
                                        <div class="card-body">
                                            <div class="row">
                                                <div class="col-md-6 mb-3">
                                                    <label class="form-label">Project Name *</label>
                                                    <input type="text" class="form-control" id="projectName" placeholder="Enter project name" required>
                                                </div>
                                                <div class="col-md-6 mb-3">
                                                    <label class="form-label">Client *</label>
                                                    <select class="form-select" id="clientSelect" required>
                                                        <option value="">Select a client...</option>
                                                    </select>
                                                </div>
                                                <div class="col-12 mb-3">
                                                    <label class="form-label">Notes</label>
                                                    <textarea class="form-control" id="estimateNotes" rows="2" placeholder="Additional notes or comments"></textarea>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Items Section -->
                                    <div class="card">
                                        <div class="card-header d-flex justify-content-between align-items-center">
                                            <h6 class="mb-0">Estimate Items</h6>
                                            <button type="button" class="btn btn-sm btn-primary" id="addItemBtn">
                                                <i class="bi bi-plus-circle"></i> Add Item
                                            </button>
                                        </div>
                                        <div class="card-body">
                                            <div id="estimateItemsList">
                                                <div class="text-center text-muted py-4">
                                                    <i class="bi bi-inbox display-4"></i>
                                                    <p class="mt-2">No items added yet. Click "Add Item" to get started.</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Summary Panel -->
                                <div class="col-md-4">
                                    <div class="card estimate-summary sticky-top">
                                        <div class="card-body text-white">
                                            <h6 class="card-title">
                                                <i class="bi bi-calculator"></i> Estimate Summary
                                            </h6>
                                            
                                            <div class="mb-3">
                                                <div class="d-flex justify-content-between">
                                                    <span>Subtotal:</span>
                                                    <span>$<span id="subtotalAmount">0.00</span></span>
                                                </div>
                                            </div>
                                            
                                            <div class="mb-3">
                                                <label class="form-label text-white">Markup %:</label>
                                                <div class="input-group input-group-sm">
                                                    <input type="number" class="form-control" id="markupPercentage" 
                                                           value="15" min="0" max="100" step="0.1">
                                                    <span class="input-group-text">%</span>
                                                </div>
                                                <div class="d-flex justify-content-between mt-2">
                                                    <span>Markup Amount:</span>
                                                    <span>$<span id="markupAmount">0.00</span></span>
                                                </div>
                                            </div>
                                            
                                            <hr class="border-white-50">
                                            
                                            <div class="d-flex justify-content-between mb-4">
                                                <strong>Total Amount:</strong>
                                                <strong class="fs-4">$<span id="totalAmount">0.00</span></strong>
                                            </div>
                                            
                                            <div class="d-grid gap-2">
                                                <button type="button" class="btn btn-light" id="saveEstimateBtn" disabled>
                                                    <i class="bi bi-save"></i> Save Estimate
                                                </button>
                                                <div class="btn-group w-100">
                                                    <button type="button" class="btn btn-outline-light btn-sm" onclick="estimateBuilder.previewEstimate()">
                                                        <i class="bi bi-eye"></i> Preview
                                                    </button>
                                                    <button type="button" class="btn btn-outline-light btn-sm" onclick="estimateBuilder.shareCurrentEstimate('email')">
                                                        <i class="bi bi-envelope"></i> Email
                                                    </button>
                                                    <button type="button" class="btn btn-outline-light btn-sm" onclick="estimateBuilder.shareCurrentEstimate('print')">
                                                        <i class="bi bi-printer"></i> Print
                                                    </button>
                                                </div>
                                                <button type="button" class="btn btn-success btn-sm" onclick="estimateBuilder.createContractFromEstimate()" disabled id="createContractBtn">
                                                    <i class="bi bi-file-earmark-text"></i> Create Contract
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modal = new bootstrap.Modal(document.getElementById('createEstimateModal'));
        
        this.setupEstimateModalEvents();
        this.loadClientsForEstimate();
        
        modal.show();

        // Clean up modal after it's hidden
        document.getElementById('createEstimateModal').addEventListener('hidden.bs.modal', function() {
            this.remove();
        });
    }

    setupEstimateModalEvents() {
        // Add item button
        document.getElementById('addItemBtn').addEventListener('click', () => {
            this.showAddItemModal();
        });

        // Markup percentage change
        document.getElementById('markupPercentage').addEventListener('input', () => {
            this.calculateTotals();
        });

        // Save estimate button
        document.getElementById('saveEstimateBtn').addEventListener('click', () => {
            this.saveEstimate();
        });

        // Form validation
        const projectNameInput = document.getElementById('projectName');
        const clientSelect = document.getElementById('clientSelect');
        
        [projectNameInput, clientSelect].forEach(element => {
            element.addEventListener('input', () => {
                this.validateEstimateForm();
            });
        });
    }

    // Sharing and Integration Methods
    shareCurrentEstimate(method) {
        if (!this.estimate.id) {
            alert('Please save the estimate first before sharing');
            return;
        }
        
        if (window.app) {
            window.app.shareEstimate(this.estimate.id, method);
        }
    }

    previewEstimate() {
        const estimateData = window.app?.generateEstimateReport(this.estimate) || 'Preview not available';
        
        // Show preview modal
        const previewModal = `
            <div class="modal fade" id="estimatePreviewModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="bi bi-eye"></i> Estimate Preview
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div style="max-height: 500px; overflow-y: auto;">
                                ${estimateData}
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                            <button type="button" class="btn btn-primary" onclick="estimateBuilder.shareCurrentEstimate('email')">
                                <i class="bi bi-envelope"></i> Email
                            </button>
                            <button type="button" class="btn btn-outline-primary" onclick="estimateBuilder.shareCurrentEstimate('print')">
                                <i class="bi bi-printer"></i> Print
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if present
        const existingModal = document.getElementById('estimatePreviewModal');
        if (existingModal) {
            existingModal.remove();
        }

        document.body.insertAdjacentHTML('beforeend', previewModal);
        const modal = new bootstrap.Modal(document.getElementById('estimatePreviewModal'));
        modal.show();
    }

    createContractFromEstimate() {
        if (!this.estimate.id) {
            alert('Please save the estimate first before creating a contract');
            return;
        }

        if (window.contractCreator) {
            window.contractCreator.createFromEstimate(this.estimate.id);
            window.app?.loadModule('contracts');
        }
    }

    async loadClientsForEstimate() {
        try {
            const clients = await window.electronAPI.invoke('db:getClients');
            const select = document.getElementById('clientSelect');
            
            clients.forEach(client => {
                const option = document.createElement('option');
                option.value = client.id;
                option.textContent = client.name;
                select.appendChild(option);
            });
        } catch (error) {
            console.error('Failed to load clients:', error);
        }
    }

    showAddItemModal() {
        // Show the existing add item modal
        const addItemModal = new bootstrap.Modal(document.getElementById('addItemModal'));
        this.loadItemsForModal();
        addItemModal.show();
    }

    async loadItemsForModal() {
        const industryId = window.app ? window.app.selectedIndustry : null;
        
        try {
            // Load materials
            const materials = await window.electronAPI.invoke('db:getMaterials', industryId);
            const materialsBody = document.getElementById('materialsTableBody');
            
            materialsBody.innerHTML = materials.map(material => `
                <tr>
                    <td><strong>${material.name}</strong></td>
                    <td>${material.description || 'N/A'}</td>
                    <td>$${material.unit_cost.toFixed(2)}</td>
                    <td>${material.unit_type}</td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="estimateBuilder.selectItem('material', ${JSON.stringify(material).replace(/"/g, '&quot;')})">
                            Select
                        </button>
                    </td>
                </tr>
            `).join('');

            // Load labor
            const labor = await window.electronAPI.invoke('db:getLabor', industryId);
            const laborBody = document.getElementById('laborTableBody');
            
            laborBody.innerHTML = labor.map(laborItem => `
                <tr>
                    <td><strong>${laborItem.task_name}</strong></td>
                    <td>${laborItem.description || 'N/A'}</td>
                    <td>$${laborItem.hourly_rate.toFixed(2)}</td>
                    <td>${laborItem.category || 'N/A'}</td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="estimateBuilder.selectItem('labor', ${JSON.stringify(laborItem).replace(/"/g, '&quot;')})">
                            Select
                        </button>
                    </td>
                </tr>
            `).join('');
        } catch (error) {
            console.error('Failed to load items:', error);
        }
    }

    selectItem(type, item) {
        this.selectedItem = { type, ...item };
        
        // Show quantity modal
        const quantityModal = new bootstrap.Modal(document.getElementById('quantityModal'));
        
        if (type === 'material') {
            document.getElementById('selectedItemName').textContent = item.name;
            document.getElementById('selectedItemDescription').textContent = item.description || '';
            document.getElementById('selectedItemCost').textContent = item.unit_cost.toFixed(2);
        } else {
            document.getElementById('selectedItemName').textContent = item.task_name;
            document.getElementById('selectedItemDescription').textContent = item.description || '';
            document.getElementById('selectedItemCost').textContent = item.hourly_rate.toFixed(2);
        }
        
        document.getElementById('itemQuantity').value = '';
        document.getElementById('totalCost').textContent = '0.00';
        
        // Hide add item modal
        bootstrap.Modal.getInstance(document.getElementById('addItemModal')).hide();
        
        quantityModal.show();
    }

    calculateItemCost() {
        const quantity = parseFloat(document.getElementById('itemQuantity').value) || 0;
        const unitCost = this.selectedItem.type === 'material' ? 
            this.selectedItem.unit_cost : this.selectedItem.hourly_rate;
        
        const total = quantity * unitCost;
        document.getElementById('totalCost').textContent = total.toFixed(2);
        
        return total;
    }

    addItemToEstimate() {
        const quantity = parseFloat(document.getElementById('itemQuantity').value);
        if (!quantity || quantity <= 0) {
            alert('Please enter a valid quantity');
            return;
        }

        const unitCost = this.selectedItem.type === 'material' ? 
            this.selectedItem.unit_cost : this.selectedItem.hourly_rate;
        
        const totalCost = quantity * unitCost;

        const estimateItem = {
            item_type: this.selectedItem.type,
            item_id: this.selectedItem.id,
            item_name: this.selectedItem.type === 'material' ? 
                this.selectedItem.name : this.selectedItem.task_name,
            description: this.selectedItem.description || '',
            quantity: quantity,
            unit_cost: unitCost,
            total_cost: totalCost,
            unit_type: this.selectedItem.type === 'material' ? 
                this.selectedItem.unit_type : 'hours'
        };

        this.estimate.items.push(estimateItem);
        this.renderEstimateItems();
        this.calculateTotals();
        this.validateEstimateForm();

        // Hide quantity modal
        bootstrap.Modal.getInstance(document.getElementById('quantityModal')).hide();
    }

    renderEstimateItems() {
        const container = document.getElementById('estimateItemsList');
        
        if (this.estimate.items.length === 0) {
            container.innerHTML = `
                <div class="text-center text-muted py-4">
                    <i class="bi bi-inbox display-4"></i>
                    <p class="mt-2">No items added yet. Click "Add Item" to get started.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.estimate.items.map((item, index) => `
            <div class="estimate-item">
                <div class="row align-items-center">
                    <div class="col-md-4">
                        <strong>${item.item_name}</strong>
                        <br>
                        <small class="text-muted">${item.description}</small>
                    </div>
                    <div class="col-md-2 text-center">
                        <strong>${item.quantity}</strong>
                        <br>
                        <small class="text-muted">${item.unit_type}</small>
                    </div>
                    <div class="col-md-2 text-center">
                        $${item.unit_cost.toFixed(2)}
                        <br>
                        <small class="text-muted">per ${item.unit_type}</small>
                    </div>
                    <div class="col-md-3 text-center">
                        <strong>$${item.total_cost.toFixed(2)}</strong>
                        <br>
                        <span class="badge bg-${item.item_type === 'material' ? 'primary' : 'success'}">${item.item_type}</span>
                    </div>
                    <div class="col-md-1 text-center">
                        <button class="btn btn-sm btn-outline-danger" onclick="estimateBuilder.removeItem(${index})">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    removeItem(index) {
        this.estimate.items.splice(index, 1);
        this.renderEstimateItems();
        this.calculateTotals();
        this.validateEstimateForm();
    }

    calculateTotals() {
        this.estimate.subtotal = this.estimate.items.reduce((sum, item) => sum + item.total_cost, 0);
        this.estimate.markup_percentage = parseFloat(document.getElementById('markupPercentage').value) || 0;
        
        const markupAmount = this.estimate.subtotal * (this.estimate.markup_percentage / 100);
        this.estimate.total_amount = this.estimate.subtotal + markupAmount;

        // Update UI
        document.getElementById('subtotalAmount').textContent = this.estimate.subtotal.toFixed(2);
        document.getElementById('markupAmount').textContent = markupAmount.toFixed(2);
        document.getElementById('totalAmount').textContent = this.estimate.total_amount.toFixed(2);
    }

    validateEstimateForm() {
        const projectName = document.getElementById('projectName').value.trim();
        const clientId = document.getElementById('clientSelect').value;
        const hasItems = this.estimate.items.length > 0;

        const isValid = projectName && clientId && hasItems;
        document.getElementById('saveEstimateBtn').disabled = !isValid;
    }

    async saveEstimate() {
        const projectName = document.getElementById('projectName').value.trim();
        const clientId = parseInt(document.getElementById('clientSelect').value);
        const notes = document.getElementById('estimateNotes').value.trim();

        const estimateData = {
            client_id: clientId,
            project_name: projectName,
            subtotal: this.estimate.subtotal,
            markup_percentage: this.estimate.markup_percentage,
            total_amount: this.estimate.total_amount,
            status: 'draft',
            notes: notes,
            items: this.estimate.items
        };

        try {
            const estimateId = await window.electronAPI.invoke('db:saveEstimate', estimateData);
            
            // Show success message
            if (window.app) {
                window.app.showAlert('success', `Estimate saved successfully! ID: ${estimateId}`);
            }

            // Close modal
            bootstrap.Modal.getInstance(document.getElementById('createEstimateModal')).hide();

            // Refresh estimates list if we're on estimates page
            if (window.app && window.app.currentModule === 'estimates') {
                window.app.loadEstimatesData();
            }

            // Reset estimate
            this.estimate = {
                id: null,
                client_id: null,
                project_name: '',
                items: [],
                subtotal: 0,
                markup_percentage: 15,
                total_amount: 0,
                status: 'draft',
                notes: ''
            };

        } catch (error) {
            console.error('Failed to save estimate:', error);
            if (window.app) {
                window.app.showAlert('danger', 'Failed to save estimate. Please try again.');
            }
        }
    }
}

// Global instance
const estimateBuilder = new EstimateBuilder();