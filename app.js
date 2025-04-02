class App {
    constructor() {
        this.afasApi = new AfasApi();
        this.projectService = new ProjectService(this.afasApi);
        this.projects = [];
        this.sidebarData = []; // Raw data for sidebar
        this.groupedSidebarData = {}; // Data grouped by project leader
        this.selectedProjectCode = null; // Currently selected project
        this.leaderOpenState = {}; // NEW: Object to track open state of leaders
        this.selectedLeaderName = null; // Keep track of the current leader
        this.cumulativeViewMode = 'uren'; // NEW: 'uren' or 'kostprijs'
        this.container = document.getElementById('projects-container');
        this.sidebarContainer = document.getElementById('sidebar-container');
        // Ensure global access for event handlers
        window.app = this;
    }

    async init() {
        try {
            this.showSidebarLoading();
            this.showMainContentLoading(); // Show loading in main area initially

            // Fetch sidebar data first
            this.sidebarData = await this.afasApi.fetchProjectsForSidebar();
            this.groupedSidebarData = this.groupProjectsByLeader(this.sidebarData);
            this.renderSidebar();

            // Initially, don't load any specific project data
            this.showSelectProjectMessage(); 

        } catch (error) {
            this.showSidebarError('Fout bij laden projectlijst.');
            this.showMainContentError('Kan project niet laden.');
            console.error(error);
        }
    }

    // --- Loading and Error States ---
    showSidebarLoading() {
        this.sidebarContainer.innerHTML = '<div class="flex-grow flex justify-center items-center text-slate-500">Laden...</div>';
    }

    showSidebarError(message) {
        this.sidebarContainer.innerHTML = `<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded m-2" role="alert">${message}</div>`;
    }

    showMainContentLoading() {
        // Add loading state class for styling
        this.container.classList.add('loading-state'); 
        this.container.innerHTML = '<div class="flex justify-center items-center p-8"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div></div>';
    }
    
    showMainContentError(message) {
        this.container.classList.remove('loading-state');
        this.container.innerHTML = `
            <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                <span class="block sm:inline">${message}</span>
            </div>
        `;
    }

    showSelectProjectMessage() {
        this.container.classList.remove('loading-state');
        this.container.innerHTML = `
            <div class="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded relative" role="alert">
                <span class="block sm:inline">Selecteer een project uit de lijst om de details te bekijken.</span>
            </div>
        `;
    }

    // --- Sidebar Logic ---
    groupProjectsByLeader(projects) {
        return projects.reduce((acc, project) => {
            const leader = project.Projectleider || 'Onbekende Projectleider'; // Use correct field name
            if (!acc[leader]) {
                acc[leader] = [];
            }
            acc[leader].push(project);
            return acc;
        }, {});
    }

    renderSidebar() {
        // Add search bar
        let sidebarHTML = `
            <div class="mb-4 sticky top-0 bg-white pb-2">
                <h2 class="text-lg font-semibold mb-2">Voortgang</h2>
                <input 
                    type="text" 
                    placeholder="Zoeken..." 
                    class="w-full px-2 py-1 border border-slate-300 rounded-md text-sm"
                    onkeyup="window.app.filterSidebar(this.value)"
                />
            </div>
            <div id="sidebar-project-list" class="flex-grow overflow-y-auto">
        `;

        // Ensure groupedSidebarData is sorted alphabetically by leader name
        const sortedLeaders = Object.keys(this.groupedSidebarData).sort();

        for (const leader of sortedLeaders) { // Iterate over sorted keys
            const isOpen = this.leaderOpenState[leader] === true; // Check state, default to false (closed)
            const projectCount = this.groupedSidebarData[leader].length; // Get the count of projects
            sidebarHTML += `
                <details class="group mb-2" ${isOpen ? 'open' : ''} 
                         ontoggle="window.app.handleLeaderToggle('${leader.replace(/'/g, "\'")}', event.target.open)">
                    <summary class="cursor-pointer font-semibold text-slate-700 flex items-center justify-between list-none p-1 rounded-md hover:bg-slate-100">
                        <span class="flex items-center flex-1 mr-2">
                            <svg class="w-4 h-4 mr-1 flex-shrink-0 group-open:rotate-90 transition-transform duration-150" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
                            ${leader}
                        </span>
                        <span class="flex-shrink-0 inline-flex items-center justify-center w-5 h-5 text-xs font-semibold text-white bg-blue-500 rounded-full">${projectCount}</span>
                    </summary>
                    <div class="grid overflow-hidden transition-all duration-500 ease-in-out" style="grid-template-rows: ${isOpen ? '1fr' : '0fr'};">
                        <ul class="mt-1 ml-5 space-y-1">
                            ${this.groupedSidebarData[leader].map(project => `
                                <li 
                                    data-project-code="${project.Projectnummer}"
                                    data-project-name="${project.Project_omschrijving || 'Geen naam'}"
                                    data-leader-name="${leader}"
                                    class="text-sm text-slate-600 hover:text-blue-600 hover:bg-slate-100 p-1 rounded-md cursor-pointer ${this.selectedProjectCode === project.Projectnummer ? 'bg-blue-100 font-medium text-blue-700' : ''}"
                                    onclick="window.app.selectProject('${project.Projectnummer}')"
                                >
                                    ${project.Projectnummer} - ${project.Project_omschrijving || 'Geen naam'}
                                    <span class="block text-xs text-slate-400 ml-1">${project.Verkooprelatie || ''}</span>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                </details>
            `;
        }
        sidebarHTML += `</div>`; // Close sidebar-project-list
        this.sidebarContainer.innerHTML = sidebarHTML;
    }
    
    filterSidebar(searchTerm) {
        const term = searchTerm.toLowerCase();
        const listItems = this.sidebarContainer.querySelectorAll('#sidebar-project-list li');
        const detailsElements = this.sidebarContainer.querySelectorAll('#sidebar-project-list details');
        
        listItems.forEach(li => {
            const projectCode = li.dataset.projectCode.toLowerCase(); // Already correct (from data-project-code)
            const projectName = li.dataset.projectName.toLowerCase(); // Already correct (from data-project-name)
            const leaderName = li.dataset.leaderName.toLowerCase(); // Already correct (from data-leader-name)
            const customerName = (li.querySelector('span')?.textContent || '').toLowerCase(); // Already correct (from rendered Verkooprelatie)
            
            const isVisible = projectCode.includes(term) || 
                              projectName.includes(term) || 
                              leaderName.includes(term) ||
                              customerName.includes(term);
                              
            li.style.display = isVisible ? '' : 'none';
        });

        // Hide/show project leader sections if all projects within are hidden
        detailsElements.forEach(details => {
            const visibleItems = details.querySelectorAll('li[style*="display: none;"]');
            const totalItems = details.querySelectorAll('li');
            details.style.display = visibleItems.length === totalItems.length ? 'none' : '';
        });
    }
    
    // --- Main Content Logic ---
    async selectProject(projectCode) {
        console.log(`Selecting project: ${projectCode}`);
        this.selectedProjectCode = projectCode;
        
        // Find and store the leader name for navigation
        this.selectedLeaderName = null;
        for (const leader in this.groupedSidebarData) {
            if (this.groupedSidebarData[leader].some(p => p.Projectnummer === projectCode)) {
                this.selectedLeaderName = leader;
                break;
            }
        }
        console.log(`Selected leader: ${this.selectedLeaderName}`);

        this.renderSidebar(); // Re-render sidebar to highlight selection
        try {
            this.showMainContentLoading();
            const projectDataArray = await this.projectService.fetchProjectData(projectCode);
            const selectedProjectData = projectDataArray.length > 0 ? projectDataArray[0] : null;
            this.projects = selectedProjectData ? [selectedProjectData] : [];

            if (selectedProjectData) {
                this.renderSingleProject(selectedProjectData);
            } else {
                this.showMainContentError(`Projectdetails voor ${projectCode} niet gevonden.`);
            }
        } catch (error) {
            this.showMainContentError(`Fout bij ophalen details voor project ${projectCode}.`);
            console.error(error);
        }
    }

    renderSingleProject(project) {
        this.container.classList.remove('loading-state');
        
        const prevProjectCode = this.findNeighbourProject('prev');
        const nextProjectCode = this.findNeighbourProject('next');

        this.container.innerHTML = `
            <div class="bg-white rounded-lg shadow-md overflow-hidden mb-6">
                <div class="bg-slate-50 px-6 py-4 border-b border-slate-200">
                    <div class="flex justify-between items-center">
                        <h2 class="text-xl font-semibold text-slate-800 flex-1 truncate mr-4">${project.projectCode} - ${project.projectDescription}</h2>
                        <div class="flex items-center space-x-2">
                             <button 
                                onclick="window.app.navigateTo('prev')" 
                                class="p-1 rounded-md hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                ${!prevProjectCode ? 'disabled' : ''} 
                                title="Vorig project"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                             <button 
                                onclick="window.app.navigateTo('next')" 
                                class="p-1 rounded-md hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                ${!nextProjectCode ? 'disabled' : ''}
                                title="Volgend project"
                             >
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-slate-200">
                        <thead class="bg-slate-50">
                            <tr>
                                <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-[180px]">Fase</th>
                                <th class="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider text-right w-32">Aanneemsom</th>
                                <th class="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider text-right w-32">Nacalculatie Kosten</th>
                                <th class="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider text-right w-36">Nacalculatie Werksoorten</th>
                                <th class="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider text-right w-32">Gefactureerd</th>
                                <th class="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider text-right w-24">Voortgang</th>
                                <th class="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider text-right w-28">Nieuwe voortgang</th>
                                <th class="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider text-right w-32">Te factureren</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-slate-200">
                            ${this.renderTableBody(project)} 
                        </tbody>
                    </table>
                </div>

                <!-- Flex container for Work Types and Costs sections -->
                <div class="flex gap-6 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-lg">
                    <!-- Cumulative Work Type Section -->
                    ${project.cumulativeWorkTypes && project.cumulativeWorkTypes.length > 0 ? `
                    <div class="flex-1">
                        <div class="flex justify-between items-center mb-4">
                            <h3 class="text-lg font-semibold text-slate-700">Nacalculatie werksoorten</h3>
                            <div class="flex items-center space-x-1 rounded-lg bg-slate-200 p-0.5">
                                 <button 
                                    onclick="window.app.setCumulativeViewMode('uren')" 
                                    class="px-3 py-1 text-sm rounded-md transition ${this.cumulativeViewMode === 'uren' ? 'bg-white shadow text-slate-800 font-medium' : 'text-slate-600 hover:bg-slate-100'}"
                                >
                                    Uren
                                </button>
                                <button 
                                    onclick="window.app.setCumulativeViewMode('kostprijs')" 
                                    class="px-3 py-1 text-sm rounded-md transition ${this.cumulativeViewMode === 'kostprijs' ? 'bg-white shadow text-slate-800 font-medium' : 'text-slate-600 hover:bg-slate-100'}"
                                >
                                    Kostprijs
                                </button>
                            </div>
                        </div>
                        <div class="space-y-4">
                            ${this.renderCumulativeBars(project.cumulativeWorkTypes, this.cumulativeViewMode === 'uren')}
                        </div>
                    </div>
                    ` : ''}

                    <!-- Cumulative Cost Section -->
                    ${project.cumulativeCosts && project.cumulativeCosts.length > 0 ? `
                    <div class="flex-1">
                        <div class="flex justify-between items-center mb-4">
                            <h3 class="text-lg font-semibold text-slate-700">Nacalculatie kosten</h3>
                        </div>
                        <div class="space-y-4">
                            ${this.renderCumulativeCostBars(project.cumulativeCosts)}
                        </div>
                    </div>
                    ` : ''}
                </div>
            </div>
            <!-- Bottom Button outside main card -->
            <div class="mt-6 text-right">
                 <button 
                    class="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-5 rounded-md transition duration-150 ease-in-out"
                    onclick="window.app.processAndNavigateNext()"
                    title="Voortgang opslaan en naar het volgende project in de lijst van deze projectleider gaan"
                 >
                    Bijwerken en volgende →
                </button>
             </div>
        `;
    }

    // NEW Helper to render cumulative bars
    renderCumulativeBars(cumulativeData, isUren) {
        if (!cumulativeData || cumulativeData.length === 0) {
            return '<p class="text-sm text-slate-500">Geen nacalculatie werksoorten data beschikbaar.</p>';
        }

        // Calculate totals
        const totalBudget = cumulativeData.reduce((sum, item) => sum + (isUren ? item.budgetHours : item.budgetCosts), 0);
        const totalActual = cumulativeData.reduce((sum, item) => sum + (isUren ? item.actualHours : item.actualCosts), 0);
        const totalProgress = totalBudget > 0 ? Math.min(100, Math.round((totalActual / totalBudget) * 100)) : 0;

        let html = `
            <div class="flex items-center mb-4">
                 <span class="w-48 pr-2 text-sm font-semibold text-slate-600">Totaal</span>
                 <div class="flex-1 mx-4">
                     <div class="w-full bg-slate-200 rounded-full h-4 relative">
                        <div class="progress-bar-inner bg-blue-600 hover:bg-blue-700 h-4 rounded-full text-white flex items-center justify-start pl-2 text-xs" style="--progress-width: ${totalProgress}%;">
                           ${totalActual > 0 ? (isUren ? totalActual.toLocaleString() : '€' + totalActual.toLocaleString()) : ''} 
                         </div>
                    </div>
                </div>
                <span class="w-20 text-sm text-right text-slate-500">
                   ${isUren ? totalBudget.toLocaleString() : '€' + totalBudget.toLocaleString()}
                </span>
            </div>
        `;

        html += cumulativeData.map(item => {
            const budget = isUren ? item.budgetHours : item.budgetCosts;
            const actual = isUren ? item.actualHours : item.actualCosts;
            const progressPercent = budget > 0 ? Math.min(100, Math.round((actual / budget) * 100)) : 0;
            const labelText = `${item.itemDescription || 'Geen omschrijving'} (${item.itemCode})`;
            
            return `
                <div class="flex items-center">
                    <span class="w-48 pr-2 text-sm text-slate-600 truncate" title="${labelText}">${labelText}</span>
                    <div class="flex-1 mx-4">
                         <div class="w-full bg-slate-200 rounded-full h-4 relative">
                            <div class="progress-bar-inner bg-blue-600 hover:bg-blue-700 h-4 rounded-full text-white flex items-center justify-start pl-2 text-xs" style="--progress-width: ${progressPercent}%;">
                               ${actual > 0 ? (isUren ? actual.toLocaleString() : '€' + actual.toLocaleString()) : ''} 
                             </div>
                        </div>
                    </div>
                     <span class="w-20 text-sm text-right text-slate-500">
                       ${isUren ? budget.toLocaleString() : '€' + budget.toLocaleString()}
                    </span>
                </div>
            `;
        }).join('');
        
        return html;
    }

    // NEW Helper to render cumulative cost bars (simpler version)
    renderCumulativeCostBars(cumulativeData) {
        if (!cumulativeData || cumulativeData.length === 0) {
            return '<p class="text-sm text-slate-500">Geen nacalculatie kosten data beschikbaar.</p>';
        }

        // Calculate totals
        const totalBudget = cumulativeData.reduce((sum, item) => sum + item.budgetCosts, 0);
        const totalActual = cumulativeData.reduce((sum, item) => sum + item.actualCosts, 0);
        const totalProgress = totalBudget > 0 ? Math.min(100, Math.round((totalActual / totalBudget) * 100)) : 0;

        let html = `
            <div class="flex items-center mb-4">
                 <span class="w-48 pr-2 text-sm font-semibold text-slate-600">Totaal Kosten</span>
                 <div class="flex-1 mx-4">
                     <div class="w-full bg-slate-200 rounded-full h-4 relative">
                        <div class="progress-bar-inner bg-purple-600 hover:bg-purple-700 h-4 rounded-full text-white flex items-center justify-start pl-2 text-xs" style="--progress-width: ${totalProgress}%;">
                           ${totalActual > 0 ? '€' + totalActual.toLocaleString() : ''} 
                         </div>
                    </div>
                </div>
                <span class="w-20 text-sm text-right text-slate-500">
                   ${'€' + totalBudget.toLocaleString()}
                </span>
            </div>
        `;

        html += cumulativeData.map(item => {
            const budget = item.budgetCosts;
            const actual = item.actualCosts;
            const progressPercent = budget > 0 ? Math.min(100, Math.round((actual / budget) * 100)) : 0;
            const labelText = `${item.itemDescription || 'Geen omschrijving'} (${item.itemCode})`;
            
            return `
                <div class="flex items-center">
                    <span class="w-48 pr-2 text-sm text-slate-600 truncate" title="${labelText}">${labelText}</span>
                    <div class="flex-1 mx-4">
                         <div class="w-full bg-slate-200 rounded-full h-4 relative">
                            <div class="progress-bar-inner bg-purple-600 hover:bg-purple-700 h-4 rounded-full text-white flex items-center justify-start pl-2 text-xs" style="--progress-width: ${progressPercent}%;">
                               ${actual > 0 ? '€' + actual.toLocaleString() : ''} 
                             </div>
                        </div>
                    </div>
                     <span class="w-20 text-sm text-right text-slate-500">
                       ${'€' + budget.toLocaleString()}
                    </span>
                </div>
            `;
        }).join('');
        
        return html;
    }

    // Helper to render table body (extracted for clarity)
    renderTableBody(project) {
        return `
            <tbody class="bg-white divide-y divide-slate-200">
                ${project.phases.map(phase => `
                    <tr class="hover:bg-slate-50">
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">${phase.phaseDescription}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500 text-right">€ ${phase.contractSum.toLocaleString()}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500 text-right">€ ${phase.actualCosts.toLocaleString()}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500 text-right">€ ${phase.actualWorkTypes.toLocaleString()}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500 text-right">€ ${phase.invoiced.toLocaleString()}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500 text-right">${phase.progress}%</td>
                        <td class="px-6 py-4 whitespace-nowrap text-right">
                            <input
                                type="number"
                                min="0"
                                max="100"
                                class="mt-1 block w-20 rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-right"
                                value="${phase.newProgress === null ? '' : phase.newProgress}" 
                                onchange="window.app.handleProgressChange('${project.projectCode}', '${phase.phaseCode}', this.value)"
                            />
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium ${phase.toInvoice < 0 ? 'text-red-600' : 'text-green-600'} to-invoice text-right">€ ${phase.toInvoice.toLocaleString()}</td>
                    </tr>
                `).join('')}
            </tbody>
        `;
    }

    // --- Helper to find previous/next project under the same leader ---
    findNeighbourProject(direction) {
        if (!this.selectedProjectCode || !this.selectedLeaderName) {
            return null; // No project or leader selected
        }
        const leaderProjects = this.groupedSidebarData[this.selectedLeaderName];
        if (!leaderProjects || leaderProjects.length <= 1) {
            return null; // No neighbours in this list
        }
        const currentIndex = leaderProjects.findIndex(p => p.Projectnummer === this.selectedProjectCode);
        if (currentIndex === -1) {
            return null; // Should not happen, but safety check
        }

        let neighbourIndex;
        if (direction === 'next') {
            neighbourIndex = currentIndex + 1;
        } else if (direction === 'prev') {
            neighbourIndex = currentIndex - 1;
        } else {
            return null;
        }

        // Check bounds
        if (neighbourIndex >= 0 && neighbourIndex < leaderProjects.length) {
            return leaderProjects[neighbourIndex].Projectnummer;
        }
        return null; // No neighbour in that direction
    }

    // --- Navigation methods ---
    async navigateTo(direction) {
        const neighbourProjectCode = this.findNeighbourProject(direction);
        if (!neighbourProjectCode) {
            console.log(`No ${direction} project found.`);
            return; 
        }
        
        // Directly select the next project without animation
        await this.selectProject(neighbourProjectCode);
    }
    
    async processAndNavigateNext() {
        if (!this.selectedProjectCode) return;
        
        console.log('Processing progress before navigating...');
        // Assuming handleSubmitProgress handles its own loading/success/error messages
        await this.handleSubmitProgress(this.selectedProjectCode);
        
        console.log('Navigating to next project...');
        await this.navigateTo('next');
    }
    
    // --- Existing Methods (potentially needing adjustments later) ---
    // renderProjects() { // We now use renderSingleProject instead
    //     // ... original code removed ...
    // }

    handleProgressChange(projectCode, phaseCode, newProgressValue) {
        if (projectCode !== this.selectedProjectCode) return; // Only update the visible project
        
        const progress = Math.min(100, Math.max(0, Number(newProgressValue)));
        this.projects = this.projectService.updateProjectProgress(
            this.projects, // Update the master list
            projectCode,
            phaseCode,
            progress
        );
        // Re-render only the affected input and toInvoice cell for performance
        this.updateRenderedProgress(projectCode, phaseCode);
    }

    // Helper to update specific cells without full re-render
    updateRenderedProgress(projectCode, phaseCode) {
        if (projectCode !== this.selectedProjectCode) return; 

        const project = this.projects.find(p => p.projectCode === projectCode);
        const phase = project?.phases.find(ph => ph.phaseCode === phaseCode);
        if (!phase) return;

        // Find the specific input and cell in the DOM
        const inputElement = this.container.querySelector(`input[onchange*="handleProgressChange('${projectCode}', '${phaseCode}'"]`);
        const toInvoiceCell = inputElement?.closest('tr').querySelector('.to-invoice');

        if (inputElement) {
            inputElement.value = phase.newProgress === null ? '' : phase.newProgress;
        }
        if (toInvoiceCell) {
            // Update classes for color and alignment
            toInvoiceCell.className = `px-6 py-4 whitespace-nowrap text-sm font-medium ${phase.toInvoice < 0 ? 'text-red-600' : 'text-green-600'} to-invoice text-right`;
            toInvoiceCell.textContent = `€ ${phase.toInvoice.toLocaleString()}`;
        }
    }

    async handleSubmitProgress(projectCode) {
        if (projectCode !== this.selectedProjectCode) return;

        // Find the project in our (now potentially single-item) this.projects array
        const project = this.projects.find(p => p.projectCode === projectCode);
        if (!project) return;

        const phasesToProcess = project.phases.filter(
            phase => phase.newProgress !== null && 
            phase.newProgress !== undefined && 
            phase.toInvoice > 0
        );

        if (phasesToProcess.length === 0) {
            alert('Er zijn geen nieuwe voortgangspercentages met een te factureren bedrag gevonden voor dit project.');
            return;
        }

        const confirmation = confirm(
            `Weet u zeker dat u de voortgang voor project ${projectCode} wilt verwerken? Er zullen ${phasesToProcess.length} factuurregels worden aangemaakt.`
        );

        if (confirmation) {
            this.showMainContentLoading(); // Show loading indicator
            const results = [];
            try {
                for (const phase of phasesToProcess) {
                    const result = await this.afasApi.createDirectInvoice(
                        project.projectCode,
                        phase.phaseCode,
                        phase.toInvoice
                    );
                    results.push({ phase: phase.phaseCode, ...result });
                }

                const successCount = results.filter(r => r.success).length;
                const failCount = results.filter(r => !r.success).length;

                let message = `${successCount} factuurregels succesvol verwerkt.`;
                if (failCount > 0) {
                    message += `\n${failCount} factuurregels NIET verwerkt:\n`;
                    results.filter(r => !r.success).forEach(r => {
                        message += `- Fase ${r.phase}: ${r.details || r.message}\n`;
                    });
                } else if (successCount > 0) {
                    const invoiceNumbers = results
                        .filter(r => r.success && r.invoiceNumber)
                        .map(r => `Fase ${r.phase}: ${r.invoiceNumber}`)
                        .join('\n');
                    if (invoiceNumbers) {
                        message += `\nFactuurnummers:\n${invoiceNumbers}`;
                    }
                }
                alert(message);

                // Refresh only the current project's data after submission
                await this.selectProject(projectCode);

            } catch (error) {
                console.error('Error submitting progress:', error);
                alert('Er is een onverwachte fout opgetreden bij het verwerken van de voortgang.');
                // Still refresh current project data even if there was an error
                await this.selectProject(projectCode);
            }
        }
    }

    handleLeaderToggle(leader, isOpen) {
        this.leaderOpenState[leader] = isOpen;
        // Optional: Log state changes for debugging
        // console.log('Leader Open State:', this.leaderOpenState); 
    }

    // NEW: Function to toggle cumulative view
    setCumulativeViewMode(mode) {
        if (mode === this.cumulativeViewMode) return; // No change
        this.cumulativeViewMode = mode;
        // Re-render the current project to reflect the change
        if (this.selectedProjectCode && this.projects.length > 0) {
            this.renderSingleProject(this.projects[0]); 
        }
    }
}

// Initialize the application
const app = new App();
app.init(); 