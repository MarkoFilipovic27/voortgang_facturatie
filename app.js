console.log('--- app.js loaded ---'); // Check if script runs at all

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
        // Notificatie container maken
        this.setupNotificationSystem();
    }

    async init() {
        console.log('--- App.init() started ---'); // Check if init runs
        try {
            this.showSidebarLoading();
            this.showMainContentLoading(); // Show loading in main area initially

            // Fetch sidebar data (using the restored fetchSidebarProjects)
            await this.fetchSidebarProjects();

            // Initially, show the select project message
            this.showSelectProjectMessage(); 

        } catch (error) {
            // Errors from fetchSidebarProjects are handled within that function (showSidebarError)
            this.showMainContentError('Kan project niet laden vanwege fout in sidebar.');
            console.error("Error during init, likely from sidebar fetch:", error);
        }
        console.log('--- App.init() finished ---');
    }

    // Fetch projects for sidebar
    async fetchSidebarProjects() {
        try {
            const sidebarData = await this.afasApi.fetchSidebarProjects();
            
            if (!sidebarData || !sidebarData.rows || sidebarData.rows.length === 0) {
                this.showSidebarError('Geen projecten gevonden.');
                return;
            }
            
            console.log(`Loaded ${sidebarData.rows.length} projects for sidebar`);
            this.sidebarData = sidebarData.rows;
            this.groupedSidebarData = this.groupProjectsByLeader(sidebarData.rows);
            
            // Render the sidebar with the retrieved data
            this.renderSidebar();
        } catch (error) {
            console.error('Error fetching sidebar projects:', error);
            this.showSidebarError('Fout bij het ophalen van projecten.');
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
                        <div class="p-4 space-y-4">
                            <!-- Voortgangsbalken voor werksoorten -->
                            <div id="cumulative-work-types-uren">
                                ${this.renderCumulativeBars(project.cumulativeWorkTypes, this.cumulativeViewMode === 'uren')}
                            </div>
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
                            <div class="mb-6">
                                <h4 class="text-lg font-semibold mb-2 text-slate-700">Kostensoorten</h4>
                                <div id="cumulative-costs">
                                    ${this.renderCumulativeCostBars(project.cumulativeCosts)}
                                </div>
                            </div>
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

    // OLD Helper to render cumulative bars (Keep for reference or future use if needed)
    renderCumulativeBars(cumulativeData, isUren) {
        console.log('renderCumulativeBars called with data:', cumulativeData);
        console.log('isUren:', isUren);
        
        if (!cumulativeData || cumulativeData.length === 0) {
            console.log('No cumulative data available.');
            return '<p class="text-sm text-slate-500">Geen nacalculatie werksoorten data beschikbaar.</p>';
        }

        // Calculate totals
        const totalBudget = cumulativeData.reduce((sum, item) => sum + (isUren ? item.budgetHours : item.budgetCosts), 0);
        const totalActual = cumulativeData.reduce((sum, item) => sum + (isUren ? item.actualHours : item.actualCosts), 0);
        const totalProgress = totalBudget > 0 ? Math.min(100, Math.round((totalActual / totalBudget) * 100)) : 0;
        
        console.log('Totals calculated:', { totalBudget, totalActual, totalProgress });

        let html = `
            <div class="flex items-center mb-4">
                 <span class="w-48 pr-2 text-sm font-semibold text-slate-600">Totaal</span>
                 <div class="flex-1 mx-4">
                     <div class="w-full bg-slate-200 rounded-full h-4 relative">
                        <div class="progress-bar-inner bg-blue-600 hover:bg-blue-700 h-4 rounded-full text-white flex items-center justify-start pl-2 text-xs" style="width: ${totalProgress}%;">
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
                            <div class="progress-bar-inner bg-blue-600 hover:bg-blue-700 h-4 rounded-full text-white flex items-center justify-start pl-2 text-xs" style="width: ${progressPercent}%;">
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
                        <div class="progress-bar-inner bg-purple-600 hover:bg-purple-700 h-4 rounded-full text-white flex items-center justify-start pl-2 text-xs" style="width: ${totalProgress}%;">
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
                            <div class="progress-bar-inner bg-purple-600 hover:bg-purple-700 h-4 rounded-full text-white flex items-center justify-start pl-2 text-xs" style="width: ${progressPercent}%;">
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
    
    // Add missing setCumulativeViewMode function
    setCumulativeViewMode(mode) {
        if (mode !== 'uren' && mode !== 'kostprijs') return;
        
        this.cumulativeViewMode = mode;
        const project = this.projects.find(p => p.projectCode === this.selectedProjectCode);
        if (!project) return;
        
        // Update the view for work types
        const container = document.getElementById('cumulative-work-types-uren');
        if (container) {
            container.innerHTML = this.renderCumulativeBars(project.cumulativeWorkTypes, mode === 'uren');
        }
        
        // Re-render the buttons to update styling
        this.renderSingleProject(project);
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
        const inputElement = this.container.querySelector(`input[onchange*="${projectCode}"][onchange*="${phaseCode}"]`);
        if (inputElement) {
            inputElement.value = phase.newProgress === null ? '' : phase.newProgress;
        }

        // Update the "to invoice" cell
        const toInvoiceCell = this.container.querySelector(`tr:has(input[onchange*="${projectCode}"][onchange*="${phaseCode}"]) td.to-invoice`);
        if (toInvoiceCell) {
            toInvoiceCell.textContent = `€ ${phase.toInvoice.toLocaleString()}`;
            toInvoiceCell.className = `px-6 py-4 whitespace-nowrap text-sm font-medium ${phase.toInvoice < 0 ? 'text-red-600' : 'text-green-600'} to-invoice text-right`;
        }
    }

    handleSubmitProgress(projectCode) {
        return new Promise(async (resolve, reject) => {
            try {
                console.log(`Submitting progress for project ${projectCode}`);
                
                // Vind het huidige project
                const project = this.projects.find(p => p.projectCode === projectCode);
                if (!project) {
                    throw new Error(`Project ${projectCode} niet gevonden`);
                }
                
                let successMessage = "Voortgang bijgewerkt";
                let errorMessage = null;
                
                // Zoek alle fasen met gewijzigde voortgang en een positief te factureren bedrag
                const phasesToInvoice = project.phases.filter(phase => 
                    phase.newProgress !== null && 
                    phase.newProgress !== phase.progress &&
                    phase.toInvoice > 0
                );
                
                console.log(`Found ${phasesToInvoice.length} phases to invoice`, phasesToInvoice);
                
                if (phasesToInvoice.length > 0) {
                    // Creëer alle facturen parallel
                    const invoicePromises = phasesToInvoice.map(phase => {
                        console.log(`Creating invoice for phase ${phase.phaseCode} with amount ${phase.toInvoice}`);
                        return this.afasApi.createDirectInvoice(
                            projectCode,
                            phase.phaseCode,
                            phase.toInvoice
                        );
                    });
                    
                    // Wacht op alle factuurcreaties
                    const invoiceResults = await Promise.all(invoicePromises);
                    console.log('Invoice results:', invoiceResults);
                    
                    // Verwerk de resultaten
                    const successfulInvoices = invoiceResults.filter(result => result.success);
                    const failedInvoices = invoiceResults.filter(result => !result.success);
                    
                    if (successfulInvoices.length > 0) {
                        // Haal de factuurnummers op voor de bevestigingsmelding
                        const invoiceNumbers = successfulInvoices
                            .map(result => result.invoiceNumber)
                            .filter(number => number !== null)
                            .join(', ');
                        
                        if (invoiceNumbers) {
                            successMessage = `Voortgang bijgewerkt en ${successfulInvoices.length} factuur/facturen aangemaakt (${invoiceNumbers})`;
                        } else {
                            successMessage = `Voortgang bijgewerkt en ${successfulInvoices.length} factuur/facturen aangemaakt`;
                        }
                    }
                    
                    if (failedInvoices.length > 0) {
                        errorMessage = `${failedInvoices.length} factuur/facturen konden niet worden aangemaakt: ${failedInvoices.map(r => r.message).join('; ')}`;
                    }
                }
                
                // Toon een succesmelding met het nieuwe notificatiesysteem
                if (successMessage) {
                    console.log(`Success: ${successMessage}`);
                    this.showNotification(successMessage, 'success', 8000);
                }
                
                // Toon evt. foutmelding met het nieuwe notificatiesysteem
                if (errorMessage) {
                    console.error(`Error: ${errorMessage}`);
                    this.showNotification(errorMessage, 'error', 10000);
                }
                
                // Update de progress in het project naar de nieuwe waarden (voor UI)
                for (const phase of project.phases) {
                    if (phase.newProgress !== null && phase.newProgress !== phase.progress) {
                        phase.progress = phase.newProgress;
                        phase.newProgress = null;
                    }
                }
                
                resolve(successMessage);
            } catch (error) {
                console.error('Error in handleSubmitProgress:', error);
                this.showNotification(`Er is een fout opgetreden: ${error.message}`, 'error', 10000);
                reject(error);
            }
        });
    }

    // Notificatiesysteem opzetten
    setupNotificationSystem() {
        // Creëer een container voor notificaties als die nog niet bestaat
        if (!document.getElementById('notification-container')) {
            const notificationContainer = document.createElement('div');
            notificationContainer.id = 'notification-container';
            notificationContainer.className = 'fixed top-0 right-0 left-0 flex justify-center items-start z-50 p-4 pointer-events-none';
            document.body.appendChild(notificationContainer);
            
            // Voeg CSS toe voor notificaties
            const style = document.createElement('style');
            style.textContent = `
                .notification {
                    transition: all 0.3s ease;
                    max-width: 90%;
                    margin-bottom: 0.5rem;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                    pointer-events: auto;
                    animation: slideDown 0.3s ease forwards;
                    transform: translateY(-20px);
                    opacity: 0;
                }
                @keyframes slideDown {
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }
                .notification.success {
                    background-color: #1e40af;
                    color: white;
                    border-left: 4px solid #3b82f6;
                }
                .notification.error {
                    background-color: #b91c1c;
                    color: white;
                    border-left: 4px solid #ef4444;
                }
                .notification.info {
                    background-color: #0369a1;
                    color: white; 
                    border-left: 4px solid #38bdf8;
                }
                .close-btn {
                    cursor: pointer;
                    font-weight: bold;
                    font-size: 1.25rem;
                    line-height: 1;
                    transition: opacity 0.2s;
                }
                .close-btn:hover {
                    opacity: 0.7;
                }
            `;
            document.head.appendChild(style);
        }
    }

    // Toon een notificatie
    showNotification(message, type = 'info', duration = 5000) {
        const container = document.getElementById('notification-container');
        if (!container) return;
        
        // Maak de notificatie element
        const notification = document.createElement('div');
        notification.className = `notification ${type} flex items-center justify-between rounded px-4 py-3 mb-2`;
        
        // Inhoud van de notificatie
        const messageEl = document.createElement('div');
        messageEl.className = 'mr-3';
        messageEl.textContent = message;
        
        // Sluit-knop
        const closeBtn = document.createElement('button');
        closeBtn.className = 'close-btn ml-auto';
        closeBtn.innerHTML = '&times;';
        closeBtn.addEventListener('click', () => {
            this.removeNotification(notification);
        });
        
        // Voeg elementen toe aan notificatie
        notification.appendChild(messageEl);
        notification.appendChild(closeBtn);
        
        // Voeg notificatie toe aan container
        container.appendChild(notification);
        
        // Verwijder na de opgegeven tijd
        if (duration > 0) {
            setTimeout(() => {
                this.removeNotification(notification);
            }, duration);
        }
        
        return notification;
    }
    
    // Verwijder een notificatie met een fade-out effect
    removeNotification(notification) {
        if (!notification) return;
        
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(-20px)';
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }
}

// Initialisatie van de app
console.log('--- Initializing App ---');
const app = new App();
app.init();
console.log('--- App initialized globally ---');
window.app = app; // Make app global for button clicks