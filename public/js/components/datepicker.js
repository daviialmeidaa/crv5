// public/js/components/datepicker.js
function initCustomDatepickers() {
    document.querySelectorAll('.custom-datepicker:not(.initialized)').forEach(originalInput => {
        originalInput.classList.add('initialized');
        
        // Função auxiliar para normalizar datas do BD (DD/MM/YYYY ou ISO)
        function parseDate(val) {
            if (!val) return '';
            if (val.includes('/')) {
                const p = val.split('/');
                if (p.length === 3) return `${p[2]}-${p[1]}-${p[0]}`;
            }
            return val.split('T')[0];
        }
        
        // Esconder o input original mas mantê-lo no DOM para o código existente conseguir ler seu .value
        originalInput.style.display = 'none';
        
        // Criar o wrapper que vai conter o display visual e o popup do calendário
        const wrapper = document.createElement('div');
        wrapper.className = 'relative w-full';
        
        // Inserir o wrapper antes do input original e mover o original para dentro
        originalInput.parentNode.insertBefore(wrapper, originalInput);
        wrapper.appendChild(originalInput);
        
        // Criar o input visual (proxy)
        const displayInput = document.createElement('input');
        displayInput.type = 'text';
        displayInput.readOnly = true; // Para forçar o clique
        displayInput.placeholder = 'DD/MM/AAAA';
        // Copia a estética do input original
        displayInput.className = 'w-full px-3 py-2 text-sm border border-gray-200 dark:border-steel-600 bg-white dark:bg-steel-700 rounded-lg text-steel-800 dark:text-gray-200 outline-none focus:border-nexo-500 hover:border-nexo-500 input-glow transition-all cursor-pointer';
        
        // Sincronizar valor inicial (suportando se o BD mandou atributo em formato brasileiro ou ISO)
        let rawVal = originalInput.getAttribute('value') || originalInput.value;
        if (rawVal) {
            const isoVal = parseDate(rawVal);
            originalInput.value = isoVal; // Força pro formato ISO para o form original
            const parts = isoVal.split('-');
            if (parts.length === 3) {
                displayInput.value = `${parts[2]}/${parts[1]}/${parts[0]}`;
            }
        }
        
        wrapper.appendChild(displayInput);
        
        // Ícone de Calendário
        const icon = document.createElement('div');
        icon.className = 'absolute right-3 top-1/2 -translate-y-1/2 text-steel-400 pointer-events-none';
        icon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>`;
        wrapper.appendChild(icon);
        
        // Popup do Calendário
        const popup = document.createElement('div');
        popup.className = 'absolute z-50 mt-1 hidden bg-white dark:bg-steel-800 border border-gray-200 dark:border-steel-600 rounded-lg shadow-xl p-4 w-72 transform transition-all duration-200 opacity-0 scale-95 origin-top-left';
        
        // Prevenir fechamento se estourar a tela (ajuste simples de bottom se necessário, por padrão desce)
        popup.style.top = '100%';
        popup.style.left = '0';
        wrapper.appendChild(popup);
        
        // Estado local do calendário
        let currentDate = originalInput.value ? new Date(originalInput.value + 'T12:00:00') : new Date();
        let selectedDate = originalInput.value ? new Date(originalInput.value + 'T12:00:00') : null;
        
        const renderCalendar = () => {
            popup.innerHTML = '';
            
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth(); // 0-11
            
            // Header do Calendário
            const header = document.createElement('div');
            header.className = 'flex justify-between items-center mb-4';
            
            const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
            
            const title = document.createElement('div');
            title.className = 'flex items-center gap-1';
            
            // Select de Mês
            const monthSelect = document.createElement('select');
            monthSelect.className = 'appearance-none bg-transparent font-semibold text-steel-800 dark:text-gray-100 text-sm hover:text-nexo-500 dark:hover:text-nexo-400 cursor-pointer outline-none focus:ring-0';
            monthNames.forEach((m, idx) => {
                const opt = document.createElement('option');
                opt.value = idx;
                opt.textContent = m;
                opt.className = 'bg-white dark:bg-steel-800 text-steel-800 dark:text-gray-100 font-normal';
                if (idx === month) opt.selected = true;
                monthSelect.appendChild(opt);
            });
            monthSelect.onchange = (e) => {
                e.stopPropagation();
                currentDate.setMonth(parseInt(e.target.value));
                renderCalendar();
            };
            
            // Select de Ano
            const yearSelect = document.createElement('select');
            yearSelect.className = 'appearance-none bg-transparent font-semibold text-steel-800 dark:text-gray-100 text-sm hover:text-nexo-500 dark:hover:text-nexo-400 cursor-pointer outline-none focus:ring-0';
            
            const sysYear = new Date().getFullYear();
            let minYear = sysYear - 10;
            let maxYear = sysYear + 10;
            if (year < minYear) minYear = year - 5;
            if (year > maxYear) maxYear = year + 5;
            
            for (let y = minYear; y <= maxYear; y++) {
                const opt = document.createElement('option');
                opt.value = y;
                opt.textContent = y;
                opt.className = 'bg-white dark:bg-steel-800 text-steel-800 dark:text-gray-100 font-normal';
                if (y === year) opt.selected = true;
                yearSelect.appendChild(opt);
            }
            yearSelect.onchange = (e) => {
                e.stopPropagation();
                currentDate.setFullYear(parseInt(e.target.value));
                renderCalendar();
            };
            
            title.appendChild(monthSelect);
            title.appendChild(yearSelect);
            
            const navButtons = document.createElement('div');
            navButtons.className = 'flex gap-1';
            
            const prevBtn = document.createElement('button');
            prevBtn.type = 'button';
            prevBtn.className = 'p-1 rounded-md text-steel-500 hover:text-nexo-600 hover:bg-nexo-50 dark:hover:bg-steel-700 transition-colors';
            prevBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" /></svg>`;
            prevBtn.onclick = (e) => { e.stopPropagation(); currentDate.setMonth(month - 1); renderCalendar(); };
            
            const nextBtn = document.createElement('button');
            nextBtn.type = 'button';
            nextBtn.className = 'p-1 rounded-md text-steel-500 hover:text-nexo-600 hover:bg-nexo-50 dark:hover:bg-steel-700 transition-colors';
            nextBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" /></svg>`;
            nextBtn.onclick = (e) => { e.stopPropagation(); currentDate.setMonth(month + 1); renderCalendar(); };
            
            navButtons.appendChild(prevBtn);
            navButtons.appendChild(nextBtn);
            header.appendChild(title);
            header.appendChild(navButtons);
            popup.appendChild(header);
            
            // Grid de Dias da Semana
            const daysGrid = document.createElement('div');
            daysGrid.className = 'grid grid-cols-7 gap-1 text-center mb-2';
            ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].forEach(d => {
                const dayEl = document.createElement('div');
                dayEl.className = 'text-[11px] font-bold text-steel-400 dark:text-steel-500';
                dayEl.textContent = d;
                daysGrid.appendChild(dayEl);
            });
            popup.appendChild(daysGrid);
            
            // Grid de Dias
            const datesGrid = document.createElement('div');
            datesGrid.className = 'grid grid-cols-7 gap-1 text-center';
            
            const firstDay = new Date(year, month, 1).getDay();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const daysInPrevMonth = new Date(year, month, 0).getDate();
            
            // Dias do mês anterior
            for (let i = firstDay - 1; i >= 0; i--) {
                const dayEl = document.createElement('div');
                dayEl.className = 'p-1.5 text-xs text-steel-300 dark:text-steel-600 cursor-not-allowed';
                dayEl.textContent = daysInPrevMonth - i;
                datesGrid.appendChild(dayEl);
            }
            
            // Dias do mês atual
            const today = new Date();
            for (let i = 1; i <= daysInMonth; i++) {
                const dayEl = document.createElement('div');
                
                const isSelected = selectedDate && selectedDate.getDate() === i && selectedDate.getMonth() === month && selectedDate.getFullYear() === year;
                const isToday = today.getDate() === i && today.getMonth() === month && today.getFullYear() === year;
                
                if (isSelected) {
                    dayEl.className = 'p-1.5 text-xs rounded-md bg-nexo-600 text-white font-bold shadow-md shadow-nexo-500/30 cursor-pointer';
                } else if (isToday) {
                    dayEl.className = 'p-1.5 text-xs rounded-md text-nexo-600 dark:text-nexo-400 font-bold bg-nexo-50 dark:bg-nexo-900/30 hover:bg-nexo-100 dark:hover:bg-nexo-800 cursor-pointer transition-colors';
                } else {
                    dayEl.className = 'p-1.5 text-xs rounded-md text-steel-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-steel-700 cursor-pointer transition-colors';
                }
                
                dayEl.textContent = i;
                
                dayEl.onclick = (e) => {
                    e.stopPropagation();
                    const dd = String(i).padStart(2, '0');
                    const mm = String(month + 1).padStart(2, '0');
                    const yyyy = year;
                    
                    // Set visual value
                    displayInput.value = `${dd}/${mm}/${yyyy}`;
                    
                    // Set original hidden value
                    originalInput.value = `${yyyy}-${mm}-${dd}`;
                    selectedDate = new Date(yyyy, month, i);
                    
                    // Dispara evento para scripts que precisam saber que mudou
                    originalInput.dispatchEvent(new Event('change', { bubbles: true }));
                    
                    closePopup();
                };
                
                datesGrid.appendChild(dayEl);
            }
            
            // Completar grid se faltar (opcional)
            const totalCells = firstDay + daysInMonth;
            const remaining = 42 - totalCells; // 6 linhas x 7 colunas = 42
            for (let i = 1; i <= remaining; i++) {
                const dayEl = document.createElement('div');
                dayEl.className = 'p-1.5 text-xs text-steel-300 dark:text-steel-600 cursor-not-allowed';
                dayEl.textContent = i;
                datesGrid.appendChild(dayEl);
            }
            
            popup.appendChild(datesGrid);
            
            // Botão "Limpar"
            const footer = document.createElement('div');
            footer.className = 'mt-3 pt-2 border-t border-gray-100 dark:border-steel-700 text-center';
            const clearBtn = document.createElement('button');
            clearBtn.type = 'button';
            clearBtn.className = 'text-xs text-steel-500 hover:text-red-500 transition-colors font-medium px-2 py-1';
            clearBtn.textContent = 'Limpar Data';
            clearBtn.onclick = (e) => {
                e.stopPropagation();
                displayInput.value = '';
                originalInput.value = '';
                selectedDate = null;
                originalInput.dispatchEvent(new Event('change', { bubbles: true }));
                closePopup();
            };
            footer.appendChild(clearBtn);
            popup.appendChild(footer);
        };
        
        const openPopup = () => {
            // Fecha outros abertos
            document.querySelectorAll('.custom-datepicker-popup').forEach(p => {
                p.classList.add('hidden', 'opacity-0', 'scale-95');
                p.classList.remove('opacity-100', 'scale-100');
            });
            
            // Atualizar data atual se houver valor original externo
            if (originalInput.value) {
                currentDate = new Date(originalInput.value + 'T12:00:00');
                selectedDate = new Date(originalInput.value + 'T12:00:00');
            } else {
                currentDate = new Date();
                selectedDate = null;
            }
            
            renderCalendar();
            
            popup.classList.add('custom-datepicker-popup');
            popup.classList.remove('hidden');
            
            // Fix para posições na tela (se passar das bordas inferior ou lateral)
            const rect = wrapper.getBoundingClientRect();
            const scrollContainer = wrapper.closest('.custom-scrollbar') || document.body;
            const containerRect = scrollContainer.getBoundingClientRect();
            
            let originY = 'top';
            if (rect.bottom + 300 > window.innerHeight) {
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
            
            let originX = 'left';
            // Se o limite direito do input + a largura do calendário (288px) passar da borda do modal (containerRect.right)
            if (rect.left + 288 > containerRect.right - 20) {
                popup.style.left = 'auto';
                popup.style.right = '0';
                originX = 'right';
            } else {
                popup.style.left = '0';
                popup.style.right = 'auto';
                originX = 'left';
            }
            
            // Atualiza classe de origem para animação correta
            popup.classList.remove('origin-top-left', 'origin-top-right', 'origin-bottom-left', 'origin-bottom-right');
            popup.classList.add(`origin-${originY}-${originX}`);
            
            // Animar entrada
            setTimeout(() => {
                popup.classList.remove('opacity-0', 'scale-95');
                popup.classList.add('opacity-100', 'scale-100');
            }, 10);
        };
        
        const closePopup = () => {
            popup.classList.remove('opacity-100', 'scale-100');
            popup.classList.add('opacity-0', 'scale-95');
            setTimeout(() => {
                popup.classList.add('hidden');
                popup.classList.remove('custom-datepicker-popup');
            }, 200); // tempo da transição tailwind
        };
        
        displayInput.addEventListener('click', (e) => {
            e.stopPropagation();
            if (popup.classList.contains('hidden')) {
                openPopup();
            } else {
                closePopup();
            }
        });
        
        // Fechar ao clicar fora
        document.addEventListener('click', (e) => {
            if (!wrapper.contains(e.target) && !popup.classList.contains('hidden')) {
                closePopup();
            }
        });
        
        // Interceptador para quando o Javascript da página (ex: populateForm) faz: originalInput.value = "..."
        const descriptor = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
        if (descriptor && descriptor.set) {
            Object.defineProperty(originalInput, 'value', {
                get: function() { return descriptor.get.call(this); },
                set: function(val) {
                    const isoVal = parseDate(val);
                    descriptor.set.call(this, isoVal);
                    if (this.value) {
                        const parts = this.value.split('-');
                        if (parts.length === 3) displayInput.value = `${parts[2]}/${parts[1]}/${parts[0]}`;
                    } else {
                        displayInput.value = '';
                    }
                }
            });
        }
        
        // Sincronizar caso o JS dispare um evento nativo manual de change
        originalInput.addEventListener('change', () => {
            if (originalInput.value) {
                const parts = originalInput.value.split('-');
                if(parts.length === 3) {
                    displayInput.value = `${parts[2]}/${parts[1]}/${parts[0]}`;
                }
            } else {
                displayInput.value = '';
            }
        });
    });
}
// Escutar evento global caso necessite carregar assíncrono
window.addEventListener('DOMContentLoaded', initCustomDatepickers);
