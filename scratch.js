const { JSDOM } = require("jsdom");
const dom = new JSDOM(`
<!DOCTYPE html>
<html>
<body>
  <div>
    <input type="date" id="fcData" class="custom-datepicker" />
  </div>
</body>
</html>
`);
const window = dom.window;
const document = window.document;

function initCustomDatepickers() {
    document.querySelectorAll('.custom-datepicker:not(.initialized)').forEach(originalInput => {
        originalInput.classList.add('initialized');
        const wrapper = document.createElement('div');
        wrapper.className = 'relative w-full';
        originalInput.parentNode.insertBefore(wrapper, originalInput);
        wrapper.appendChild(originalInput);
    });
}

function resetDatepicker(input) {
    if (!input) return;
    const wrapper = input.parentElement;
    if (wrapper && wrapper.classList.contains('relative') && wrapper !== input.closest('div[class*="grid"]')) {
        wrapper.parentNode.insertBefore(input, wrapper);
        wrapper.remove();
    }
    input.classList.remove('initialized');
    input.style.display = '';
}

initCustomDatepickers();
console.log("After init:", document.body.innerHTML);

const fcData = document.getElementById('fcData');
resetDatepicker(fcData);
console.log("After reset:", document.body.innerHTML);

initCustomDatepickers();
console.log("After re-init:", document.body.innerHTML);
