// Contract Creator - Generate professional proposals and contracts
class ContractCreator {
    constructor() {
        this.contractTemplates = [];
        this.currentContract = null;
        this.currentProject = null;
        this.selectedIndustry = null;
        this.estimateData = null;
        this.companyInfo = {
            name: 'Your Construction Company',
            address: '123 Construction Ave',
            city: 'Builder City, BC 12345',
            phone: '(555) 123-4567',
            email: 'info@construction.com',
            license: 'License #12345'
        };
        this.init();
    }

    init() {
        console.log('ContractCreator initialized');
        this.loadCompanyInfo();
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
        console.log('ContractCreator: Current project set to:', project?.name);
        this.refreshProjectContracts();
    }

    refreshProjectContracts() {
        if (this.currentProject && window.dataManager) {
            const projectContracts = window.dataManager.data.contracts.filter(
                c => c.project_id == this.currentProject.id
            );
            // Refresh UI if contract interface is currently shown
            if (document.getElementById('mainContent').innerHTML.includes('Contract Creator')) {
                this.showContractInterface();
            }
        }
    }

    createFromEstimate(estimateId) {
        if (window.dataManager) {
            const estimate = window.dataManager.data.estimates.find(e => e.id == estimateId);
            if (estimate) {
                this.estimateData = estimate;
                // Set project context from estimate
                if (estimate.project_id) {
                    const project = window.dataManager.data.projects.find(p => p.id == estimate.project_id);
                    if (project) {
                        this.setCurrentProject(project);
                    }
                }
                this.showNewContractModal();
            }
        }
    }

    // Show Contract Creation Interface
    showContractInterface() {
        const currentProjectHeader = this.currentProject ? `
            <div class="card border-0 shadow-sm mb-4 border-start border-4 border-primary">
                <div class="card-body py-2">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <span class="text-muted small text-uppercase fw-bold">Active Project</span>
                            <h5 class="mb-0 text-primary">${this.currentProject.name}</h5>
                        </div>
                        <div class="d-flex gap-2">
                            <span class="badge bg-light text-dark border p-2">${this.currentProject.type}</span>
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
                        <small>Select a project to enable project-specific contract features. <a href="#" onclick="app.loadModule('projects')" class="text-primary fw-bold">Browse Projects</a></small>
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
                            <h2 class="mb-1 fw-bold"><i class="bi bi-file-earmark-text text-primary"></i> Contract & Proposals</h2>
                            <p class="text-muted">Generate industry-standard legal documents in seconds</p>
                        </div>
                        <div class="btn-group">
                            <button class="btn btn-primary px-4 shadow-sm" onclick="contractCreator.showNewContractModal()">
                                <i class="bi bi-plus-lg me-1"></i> Create New
                            </button>
                            <button class="btn btn-outline-secondary" onclick="contractCreator.showSettings()">
                                <i class="bi bi-gear"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="row mb-4">
                <div class="col-lg-8">
                    <div class="card border-0 shadow-sm mb-4 h-100">
                        <div class="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
                            <h5 class="mb-0 fw-bold text-dark">Document Preview</h5>
                            <div class="btn-group btn-group-sm" id="contractTools" style="display: none;">
                                <button class="btn btn-outline-primary" onclick="contractCreator.editContract()"><i class="bi bi-pencil me-1"></i> Edit</button>
                                <button class="btn btn-outline-success" onclick="contractCreator.generatePDF()"><i class="bi bi-file-earmark-pdf me-1"></i> PDF</button>
                                <button class="btn btn-primary" onclick="contractCreator.emailContract()"><i class="bi bi-send me-1"></i> Send</button>
                            </div>
                        </div>
                        <div class="card-body bg-light p-0 position-relative" style="height: 600px;">
                            <div id="contractPreview" class="h-100 overflow-auto p-4 d-flex align-items-center justify-content-center">
                                <div class="text-center text-muted">
                                    <div class="bg-white rounded-circle p-4 shadow-sm d-inline-flex mb-3">
                                        <i class="bi bi-file-earmark-text display-4"></i>
                                    </div>
                                    <h5>No Document Selected</h5>
                                    <p>Select a template or an existing contract to preview</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="col-lg-4">
                    <div class="card border-0 shadow-sm mb-4">
                        <div class="card-header bg-white py-3 border-bottom">
                            <h5 class="mb-0 fw-bold text-dark">Templates</h5>
                        </div>
                        <div class="card-body p-3">
                            <div class="mb-3">
                                <select class="form-select" id="contractIndustrySelect" onchange="contractCreator.loadContractTemplates()">
                                    <option value="">Filter by Industry...</option>
                                </select>
                            </div>
                            <div id="contractTemplatesList" class="list-group list-group-flush" style="max-height: 300px; overflow-y: auto;">
                                <!-- Templates loaded here -->
                            </div>
                        </div>
                    </div>

                    <div class="card border-0 shadow-sm">
                        <div class="card-header bg-white py-3 border-bottom">
                            <h5 class="mb-0 fw-bold text-dark">Estimate Integration</h5>
                        </div>
                        <div class="card-body p-0">
                            <div id="availableEstimates" class="list-group list-group-flush" style="max-height: 250px; overflow-y: auto;">
                                <!-- Estimates loaded here -->
                                <div class="p-3 text-center text-muted small">Loading estimates...</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('mainContent').innerHTML = content;
        this.loadIndustries();
        this.loadAvailableEstimates();
    }

    async loadIndustries() {
        try {
            const response = await fetch('/api/industries');
            const industries = await response.json();
            const select = document.getElementById('contractIndustrySelect');
            
            industries.forEach(industry => {
                const option = document.createElement('option');
                option.value = industry.id;
                option.textContent = industry.name;
                select.appendChild(option);
            });

            // Set from saved selection
            const savedIndustry = localStorage.getItem('selectedIndustry');
            if (savedIndustry) {
                select.value = savedIndustry;
                this.selectedIndustry = savedIndustry;
                this.loadContractTemplates();
            }
        } catch (error) {
            console.error('Failed to load industries:', error);
        }
    }

    async loadContractTemplates() {
        const industryId = document.getElementById('contractIndustrySelect').value;
        if (!industryId) return;

        this.selectedIndustry = industryId;
        
        try {
            const response = await fetch(`/api/contract-templates?industry=${industryId}`);
            this.contractTemplates = await response.json();
            this.renderContractTemplates();
        } catch (error) {
            console.error('Failed to load contract templates:', error);
        }
    }

    renderContractTemplates() {
        const container = document.getElementById('contractTemplatesList');
        if (!this.contractTemplates || this.contractTemplates.length === 0) {
            container.innerHTML = '<div class="text-center text-muted"><p>No templates found for this industry</p></div>';
            return;
        }

        const html = this.contractTemplates.map(template => `
            <div class="contract-template-item border rounded p-3 mb-3 hover-shadow" 
                 style="cursor: pointer;" 
                 onclick="contractCreator.selectTemplate(${template.id})">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <h6 class="mb-0">${template.name}</h6>
                    <span class="badge bg-primary">${template.type}</span>
                </div>
                <p class="text-muted small mb-2">${template.description}</p>
                <div class="mt-2">
                    <strong>Includes:</strong>
                    <div class="mt-1">
                        ${template.clauses.map(clause => `<span class="badge bg-light text-dark me-1 mb-1">${clause}</span>`).join('')}
                    </div>
                </div>
            </div>
        `).join('');
        
        container.innerHTML = html;
    }

    selectTemplate(templateId) {
        const template = this.contractTemplates.find(t => t.id === templateId);
        if (!template) return;

        this.currentContract = template;
        this.showContractPreview(template);
    }

    showContractPreview(template) {
        const container = document.getElementById('contractPreview');
        const tools = document.getElementById('contractTools');

        // Generate contract preview
        const contractHtml = this.generateContractHTML(template);
        container.innerHTML = contractHtml;
        
        tools.style.display = 'block';
    }

    generateContractHTML(template) {
        const today = new Date().toLocaleDateString();
        
        return `
            <div class="contract-document bg-white p-4 border" style="max-width: 8.5in; margin: 0 auto;">
                <!-- Contract Header -->
                <div class="text-center mb-4">
                    <h3 class="text-primary">${this.companyInfo.name}</h3>
                    <p class="mb-1">${this.companyInfo.address}</p>
                    <p class="mb-1">${this.companyInfo.city}</p>
                    <p class="mb-1">Phone: ${this.companyInfo.phone} | Email: ${this.companyInfo.email}</p>
                    <p class="mb-3">License: ${this.companyInfo.license}</p>
                    <hr>
                    <h4>${template.name}</h4>
                </div>

                <!-- Contract Details -->
                <div class="row mb-4">
                    <div class="col-6">
                        <strong>Contract Date:</strong> ${today}<br>
                        <strong>Contract Type:</strong> ${template.type}<br>
                        <strong>Project:</strong> <span class="text-muted">[Project Name]</span>
                    </div>
                    <div class="col-6">
                        <strong>Client:</strong> <span class="text-muted">[Client Name]</span><br>
                        <strong>Address:</strong> <span class="text-muted">[Client Address]</span><br>
                        <strong>Phone:</strong> <span class="text-muted">[Client Phone]</span>
                    </div>
                </div>

                <!-- Contract Clauses -->
                <div class="mb-4">
                    <h5>Contract Terms and Conditions</h5>
                    ${this.generateContractClauses(template)}
                </div>

                <!-- Estimate Integration -->
                <div class="mb-4">
                    <h5>Project Cost Breakdown</h5>
                    <div class="border p-3 bg-light">
                        <p class="mb-2"><strong>Total Project Cost:</strong> <span class="text-muted">[To be filled from estimate]</span></p>
                        <p class="mb-2"><strong>Payment Schedule:</strong> As per payment terms below</p>
                        <p class="mb-0"><strong>Contract Duration:</strong> <span class="text-muted">[To be specified]</span></p>
                    </div>
                </div>

                <!-- Signature Block -->
                <div class="row mt-5">
                    <div class="col-6">
                        <div class="signature-block">
                            <div class="border-top pt-2 mt-4">
                                <strong>Contractor Signature</strong><br>
                                ${this.companyInfo.name}<br>
                                Date: __________________
                            </div>
                        </div>
                    </div>
                    <div class="col-6">
                        <div class="signature-block">
                            <div class="border-top pt-2 mt-4">
                                <strong>Client Signature</strong><br>
                                Name: ____________________<br>
                                Date: __________________
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    generateContractClauses(template) {
        const clauseTemplates = {
            'Scope of Work': 'The Contractor agrees to provide all labor, materials, and services necessary to complete the project as described in the attached specifications and drawings.',
            'Payment Terms': 'Payment shall be made as follows: [Payment schedule to be specified]. Final payment is due upon completion and acceptance of all work.',
            'Change Orders': 'Any changes to the original scope of work must be approved in writing by both parties and may result in adjustments to the contract price and completion date.',
            'Warranty': 'The Contractor warrants all work performed for a period of one (1) year from the date of completion, excluding normal wear and tear.',
            'Insurance Requirements': 'The Contractor shall maintain appropriate insurance coverage including general liability and workers compensation as required by law.',
            'Equipment Specifications': 'All equipment used shall meet or exceed industry standards and manufacturer specifications.',
            'Operating Hours': 'Standard operating hours are Monday through Friday, 8:00 AM to 5:00 PM, unless otherwise agreed upon in writing.',
            'Maintenance': 'The Contractor shall be responsible for routine maintenance of all equipment during the contract period.',
            'Environmental Compliance': 'All work shall be performed in compliance with applicable environmental regulations and permit requirements.',
            'Safety Plan': 'The Contractor shall implement and maintain a comprehensive safety plan in accordance with OSHA requirements.',
            'Quality Control': 'All work shall be subject to quality control inspections and must meet industry standards and specifications.',
            'Testing Requirements': 'Materials and workmanship shall be tested as required by applicable codes and specifications.',
            'Historical Compliance': 'All work on historic structures shall comply with preservation standards and applicable regulatory requirements.',
            'Emergency Services': 'The Contractor agrees to provide emergency services as needed, subject to additional compensation terms.'
        };

        return template.clauses.map((clause, index) => `
            <div class="mb-3">
                <h6>${index + 1}. ${clause}</h6>
                <p>${clauseTemplates[clause] || 'Standard terms and conditions apply as per industry practice.'}</p>
            </div>
        `).join('');
    }

    async loadAvailableEstimates() {
        try {
            const response = await fetch('/api/estimates');
            const estimates = await response.json();
            this.renderAvailableEstimates(estimates);
        } catch (error) {
            console.error('Failed to load estimates:', error);
        }
    }

    renderAvailableEstimates(estimates) {
        const tbody = document.getElementById('availableEstimates');
        if (!estimates || estimates.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-muted py-4">
                        <i class="bi bi-calculator fs-2 d-block mb-2"></i>
                        No estimates available. Create estimates first in the Takeoff & Estimating module.
                    </td>
                </tr>
            `;
            return;
        }

        const html = estimates.map(estimate => `
            <tr>
                <td><strong>${estimate.project_name}</strong></td>
                <td>${estimate.client || 'N/A'}</td>
                <td class="fw-bold text-success">$${estimate.total_amount.toLocaleString()}</td>
                <td><span class="badge bg-primary">${estimate.status}</span></td>
                <td>${new Date().toLocaleDateString()}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="contractCreator.createContractFromEstimate(${estimate.id})">
                        <i class="bi bi-file-earmark-text"></i> Create Contract
                    </button>
                </td>
            </tr>
        `).join('');

        tbody.innerHTML = html;
    }

    createContractFromEstimate(estimateId) {
        if (!this.currentContract) {
            alert('Please select a contract template first');
            return;
        }

        this.showNewContractModal(estimateId);
    }

    showNewContractModal(estimateId = null) {
        const modalHtml = `
            <div class="modal fade" id="newContractModal" tabindex="-1">
                <div class="modal-dialog modal-xl">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Create New Contract</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="row">
                                <div class="col-md-6">
                                    <h6>Project Information</h6>
                                    <div class="mb-3">
                                        <label class="form-label">Project Name *</label>
                                        <input type="text" class="form-control" id="contractProjectName" required>
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label">Project Description</label>
                                        <textarea class="form-control" id="contractDescription" rows="3"></textarea>
                                    </div>
                                    <div class="row">
                                        <div class="col-6 mb-3">
                                            <label class="form-label">Start Date</label>
                                            <input type="date" class="form-control" id="contractStartDate">
                                        </div>
                                        <div class="col-6 mb-3">
                                            <label class="form-label">Completion Date</label>
                                            <input type="date" class="form-control" id="contractEndDate">
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <h6>Client Information</h6>
                                    <div class="mb-3">
                                        <label class="form-label">Client Name *</label>
                                        <input type="text" class="form-control" id="contractClientName" required>
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label">Client Address</label>
                                        <input type="text" class="form-control" id="contractClientAddress">
                                    </div>
                                    <div class="row">
                                        <div class="col-6 mb-3">
                                            <label class="form-label">Phone</label>
                                            <input type="tel" class="form-control" id="contractClientPhone">
                                        </div>
                                        <div class="col-6 mb-3">
                                            <label class="form-label">Email</label>
                                            <input type="email" class="form-control" id="contractClientEmail">
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <hr>
                            <div class="row">
                                <div class="col-md-6">
                                    <h6>Financial Terms</h6>
                                    <div class="mb-3">
                                        <label class="form-label">Contract Value *</label>
                                        <div class="input-group">
                                            <span class="input-group-text">$</span>
                                            <input type="number" class="form-control" id="contractValue" step="0.01" required>
                                        </div>
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label">Payment Schedule</label>
                                        <select class="form-select" id="paymentSchedule">
                                            <option value="net30">Net 30 days</option>
                                            <option value="progress">Progress payments</option>
                                            <option value="milestone">Milestone based</option>
                                            <option value="completion">Payment on completion</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <h6>Additional Options</h6>
                                    <div class="mb-3">
                                        <div class="form-check">
                                            <input class="form-check-input" type="checkbox" id="includeChangeOrders" checked>
                                            <label class="form-check-label" for="includeChangeOrders">
                                                Include Change Order Clause
                                            </label>
                                        </div>
                                        <div class="form-check">
                                            <input class="form-check-input" type="checkbox" id="includeWarranty" checked>
                                            <label class="form-check-label" for="includeWarranty">
                                                Include Warranty Terms
                                            </label>
                                        </div>
                                        <div class="form-check">
                                            <input class="form-check-input" type="checkbox" id="requireInsurance" checked>
                                            <label class="form-check-label" for="requireInsurance">
                                                Require Insurance Documentation
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-primary" onclick="contractCreator.generateContract()">
                                <i class="bi bi-file-earmark-text"></i> Generate Contract
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if any
        const existingModal = document.getElementById('newContractModal');
        if (existingModal) existingModal.remove();

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modal = new bootstrap.Modal(document.getElementById('newContractModal'));
        modal.show();

        // Pre-fill with estimate data if provided
        if (estimateId) {
            this.prefillEstimateData(estimateId);
        }
    }

    showCompanySettingsModal() {
        const modalHtml = `
            <div class="modal fade" id="companySettingsModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Company Information</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="mb-3">
                                <label class="form-label">Company Name *</label>
                                <input type="text" class="form-control" id="companyName" value="${this.companyInfo.name}">
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Address</label>
                                <input type="text" class="form-control" id="companyAddress" value="${this.companyInfo.address}">
                            </div>
                            <div class="mb-3">
                                <label class="form-label">City, State, ZIP</label>
                                <input type="text" class="form-control" id="companyCity" value="${this.companyInfo.city}">
                            </div>
                            <div class="row">
                                <div class="col-6 mb-3">
                                    <label class="form-label">Phone</label>
                                    <input type="tel" class="form-control" id="companyPhone" value="${this.companyInfo.phone}">
                                </div>
                                <div class="col-6 mb-3">
                                    <label class="form-label">Email</label>
                                    <input type="email" class="form-control" id="companyEmail" value="${this.companyInfo.email}">
                                </div>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">License Number</label>
                                <input type="text" class="form-control" id="companyLicense" value="${this.companyInfo.license}">
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-primary" onclick="contractCreator.saveCompanyInfo()">
                                <i class="bi bi-floppy"></i> Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if any
        const existingModal = document.getElementById('companySettingsModal');
        if (existingModal) existingModal.remove();

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modal = new bootstrap.Modal(document.getElementById('companySettingsModal'));
        modal.show();
    }

    saveCompanyInfo() {
        this.companyInfo = {
            name: document.getElementById('companyName').value || 'Your Construction Company',
            address: document.getElementById('companyAddress').value || '123 Construction Ave',
            city: document.getElementById('companyCity').value || 'Builder City, BC 12345',
            phone: document.getElementById('companyPhone').value || '(555) 123-4567',
            email: document.getElementById('companyEmail').value || 'info@construction.com',
            license: document.getElementById('companyLicense').value || 'License #12345'
        };

        localStorage.setItem('companyInfo', JSON.stringify(this.companyInfo));
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('companySettingsModal'));
        modal.hide();
        
        this.showAlert('success', 'Company information updated successfully!');
        
        // Refresh preview if contract is selected
        if (this.currentContract) {
            this.showContractPreview(this.currentContract);
        }
    }

    loadCompanyInfo() {
        const saved = localStorage.getItem('companyInfo');
        if (saved) {
            this.companyInfo = JSON.parse(saved);
        }
    }

    async generateContract() {
        const contractData = {
            template_id: this.currentContract?.id,
            project_name: document.getElementById('contractProjectName').value,
            client_name: document.getElementById('contractClientName').value,
            contract_value: document.getElementById('contractValue').value,
            start_date: document.getElementById('contractStartDate').value,
            end_date: document.getElementById('contractEndDate').value,
            payment_schedule: document.getElementById('paymentSchedule').value,
            company_info: this.companyInfo
        };

        if (!contractData.project_name || !contractData.client_name || !contractData.contract_value) {
            alert('Please fill in all required fields');
            return;
        }

        try {
            const response = await fetch('/api/generate-contract', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(contractData)
            });

            const result = await response.json();
            if (result.success) {
                const modal = bootstrap.Modal.getInstance(document.getElementById('newContractModal'));
                modal.hide();
                
                this.showAlert('success', 'Contract generated successfully!');
                this.updateContractPreviewWithData(contractData);
            }
        } catch (error) {
            console.error('Failed to generate contract:', error);
            this.showAlert('danger', 'Failed to generate contract');
        }
    }

    updateContractPreviewWithData(contractData) {
        // Update the preview with actual data
        const preview = document.getElementById('contractPreview');
        const contractHtml = this.generateContractHTML(this.currentContract)
            .replace('[Project Name]', contractData.project_name)
            .replace('[Client Name]', contractData.client_name)
            .replace('[Client Address]', contractData.client_address || 'Address not provided')
            .replace('[Client Phone]', contractData.client_phone || 'Phone not provided')
            .replace('[To be filled from estimate]', `$${parseFloat(contractData.contract_value).toLocaleString()}`);
        
        preview.innerHTML = contractHtml;
    }

    generatePDF() {
        this.showAlert('info', 'PDF generation feature coming soon! Contract preview is ready for printing.');
    }

    emailContract() {
        this.showAlert('info', 'Email feature coming soon! You can copy the contract text for now.');
    }

    editContract() {
        this.showAlert('info', 'Contract editor coming soon! Use the preview for now.');
    }

    showAlert(type, message) {
        if (window.app && window.app.showAlert) {
            window.app.showAlert(type, message);
        } else {
            alert(message);
        }
    }
}

// Initialize contract creator
const contractCreator = new ContractCreator();