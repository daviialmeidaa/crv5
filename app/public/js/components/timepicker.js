// public/js/components/timepicker.js
function initCustomTimepickers() {
    document.querySelectorAll('.custom-timepicker:not(.initialized)').forEach(originalInput => {
        originalInput.classList.add('initialized');
        
        // Esconder o input original mas mantê-lo no DOM para o código existente conseguir ler seu .value
        originalInput.style.display = 'none';
        
        // Criar o wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'relative flex-1 w-full';
        
        // Inserir o wrapper logo antes do input original, e depois mover o input para dentro
        originalInput.parentNode.insertBefore(wrapper, originalInput);
        wrapper.appendChild(originalInput);
        
        // Input visual
        const displayInput = document.createElement('input');
        displayInput.type = 'text';
        displayInput.readOnly = true; 
        displayInput.placeholder = '--:--';
        displayInput.className = 'w-full px-3 py-2 text-sm border border-gray-200 dark:border-steel-600 bg-white dark:bg-steel-700 rounded-lg text-steel-800 dark:text-gray-200 outline-none focus:border-nexo-500 hover:border-nexo-500 input-glow transition-all cursor-pointer';
        
        if (originalInput.value) {
            displayInput.value = originalInput.value;
        }
        
        wrapper.appendChild(displayInput);
        
        // Ícone de Relógio
        const icon = document.createElement('div');
        icon.className = 'absolute right-3 top-1/2 -translate-y-1/2 text-steel-400 pointer-events-none';
        icon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;
        wrapper.appendChild(icon);
        
        // Popup
        const popup = document.createElement('div');
        popup.className = 'absolute z-50 mt-1 hidden bg-white dark:bg-steel-800 border border-gray-200 dark:border-steel-600 rounded-lg shadow-xl w-40 transform transition-all duration-200 opacity-0 scale-95 origin-top-left overflow-hidden flex h-64';
        
        popup.style.top = '100%';
        popup.style.left = '0';
        wrapper.appendChild(popup);
        
        // Colunas de horas e minutos
        const hoursCol = document.createElement('div');
        hoursCol.className = 'flex-1 overflow-y-auto border-r border-gray-200 dark:border-steel-600 custom-scrollbar';
        
        const minutesCol = document.createElement('div');
        minutesCol.className = 'flex-1 overflow-y-auto custom-scrollbar';
        
        popup.appendChild(hoursCol);
        popup.appendChild(minutesCol);
        
        let selectedHour = originalInput.value ? originalInput.value.split(':')[0] : null;
        let selectedMinute = originalInput.value ? originalInput.value.split(':')[1] : null;
        
        const updateDisplay = () => {
            if (selectedHour !== null && selectedMinute !== null) {
                const val = `${selectedHour}:${selectedMinute}`;
                displayInput.value = val;
                originalInput.value = val;
                originalInput.dispatchEvent(new Event('change', { bubbles: true }));
            } else {
                displayInput.value = '';
                originalInput.value = '';
            }
        };

        const renderLists = () => {
            hoursCol.innerHTML = '';
            minutesCol.innerHTML = '';
            
            // Renderizar horas
            for (let i = 0; i < 24; i++) {
                const h = i.toString().padStart(2, '0');
                const btn = document.createElement('div');
                btn.textContent = h;
                btn.className = `p-2 text-center text-sm cursor-pointer transition-colors ${selectedHour === h ? 'bg-nexo-500 text-white font-bold border-gray-900 dark:border-white' : 'text-steel-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-steel-700'}`;
                
                if (selectedHour === h) {
                    btn.classList.add('border', 'border-gray-900', 'dark:border-white');
                }
                
                btn.onclick = (e) => {
                    e.stopPropagation();
                    selectedHour = h;
                    if (selectedMinute === null) selectedMinute = '00';
                    renderLists();
                    updateDisplay();
                };
                hoursCol.appendChild(btn);
            }
            
            // Renderizar minutos
            for (let i = 0; i < 60; i++) {
                const m = i.toString().padStart(2, '0');
                const btn = document.createElement('div');
                btn.textContent = m;
                btn.className = `p-2 text-center text-sm cursor-pointer transition-colors ${selectedMinute === m ? 'bg-nexo-500 text-white font-bold border-gray-900 dark:border-white' : 'text-steel-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-steel-700'}`;
                
                if (selectedMinute === m) {
                    btn.classList.add('border', 'border-gray-900', 'dark:border-white');
                }
                
                btn.onclick = (e) => {
                    e.stopPropagation();
                    selectedMinute = m;
                    if (selectedHour === null) selectedHour = '00';
                    renderLists();
                    updateDisplay();
                };
                minutesCol.appendChild(btn);
            }
            
            // Centralizar o scroll nos selecionados
            setTimeout(() => {
                if (selectedHour) {
                    const selNode = Array.from(hoursCol.children).find(n => n.textContent === selectedHour);
                    if (selNode) hoursCol.scrollTop = selNode.offsetTop - (hoursCol.clientHeight / 2) + (selNode.clientHeight / 2);
                }
                if (selectedMinute) {
                    const selNode = Array.from(minutesCol.children).find(n => n.textContent === selectedMinute);
                    if (selNode) minutesCol.scrollTop = selNode.offsetTop - (minutesCol.clientHeight / 2) + (selNode.clientHeight / 2);
                }
            }, 10);
        };
        
        const openPopup = () => {
            document.querySelectorAll('.custom-timepicker-popup').forEach(p => {
                p.classList.add('hidden', 'opacity-0', 'scale-95');
                p.classList.remove('opacity-100', 'scale-100');
            });
            
            if (originalInput.value) {
                selectedHour = originalInput.value.split(':')[0];
                selectedMinute = originalInput.value.split(':')[1];
            }
            
            renderLists();
            
            popup.classList.add('custom-timepicker-popup');
            popup.classList.remove('hidden');
            
            const rect = wrapper.getBoundingClientRect();
            const scrollContainer = wrapper.closest('.custom-scrollbar') || wrapper.closest('.overflow-y-auto') || wrapper.closest('.overflow-auto') || document.body;
            const containerRect = scrollContainer.getBoundingClientRect();
            
            const popupHeight = 256; // h-64 = 256px
            const bottomLimit = scrollContainer === document.body ? window.innerHeight : Math.min(window.innerHeight, containerRect.bottom);
            
            let originY = 'top';
            if (rect.bottom + popupHeight > bottomLimit) {
                popup.style.top = 'auto';
                popup.style.bottom = '100%';
                popup.style.marginBottom = '4px';
                popup.style.marginTop = '';
                originY = 'bottom';
            } else {
                popup.style.top = '100%';
                popup.style.bottom = 'auto';
                popup.style.marginTop = '4px';
                popup.style.marginBottom = '';
                originY = 'top';
            }
            
            popup.style.transformOrigin = `${originY} left`;
            
            setTimeout(() => {
                popup.classList.remove('opacity-0', 'scale-95');
                popup.classList.add('opacity-100', 'scale-100');
            }, 10);
        };
        
        displayInput.addEventListener('click', (e) => {
            e.stopPropagation();
            if (popup.classList.contains('hidden')) {
                openPopup();
            } else {
                popup.classList.add('hidden');
            }
        });
        
        // Sincronizar caso o JS dispare um change nativo
        originalInput.addEventListener('change', () => {
            displayInput.value = originalInput.value;
        });
    });
    
    // Global click para fechar timepickers abertos
    if (!window._customTimepickerGlobalClick) {
        window._customTimepickerGlobalClick = true;
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.custom-timepicker-popup') && !e.target.closest('.custom-timepicker') && !e.target.closest('input[readonly]')) {
                document.querySelectorAll('.custom-timepicker-popup').forEach(p => {
                    p.classList.add('opacity-0', 'scale-95');
                    p.classList.remove('opacity-100', 'scale-100');
                    setTimeout(() => p.classList.add('hidden'), 200);
                });
            }
        });
    }
}
window.addEventListener('DOMContentLoaded', initCustomTimepickers);
