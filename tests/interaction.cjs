const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
let checks = 0;
function check(condition, message) { assert.ok(condition, message); checks++; console.log('PASS:', message); }
class Element {
    constructor() { this.children = []; this.listeners = {}; this.attributes = {}; this.value = ''; this.hidden = false; this.disabled = false; this.textContent = ''; this.classList = {toggle() {}}; }
    setAttribute(k, v) { this.attributes[k] = v; }
    removeAttribute(k) { delete this.attributes[k]; }
    append(...items) { this.children.push(...items); }
    replaceChildren(...items) { this.children = items; }
    addEventListener(name, cb) { this.listeners[name] = cb; }
    querySelectorAll() { return this.children.filter(c => c.attributes.role === 'option'); }
    querySelector() { return this.button; }
    scrollIntoView() {}
    reset() { this.wasReset = true; }
    click() { this.listeners.click?.({target: this}); }
}
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const elements = {};
for (const match of html.matchAll(/<[^>]+\bid="([^"]+)"[^>]*>/g)) {
    const element = new Element();
    element.hidden = /\bhidden\b/.test(match[0]);
    element.disabled = /\bdisabled\b/.test(match[0]);
    elements[match[1]] = element;
}
elements['survey-form'].button = new Element();
elements['survey-form'].button.disabled = true;
const centers = [
    {id: 1, ShortName: 'Первый травмпункт', geoData: '{invalid'},
    {id: 2, ShortName: 'Второй травмпункт', geoData: '{"type":"Point","coordinates":[37.6,55.7]}'}
];
const pending = [];
let postResolve;
let postCount = 0;
let catalogFails = false;
const document = {getElementById(id) { assert.ok(elements[id], 'element exists in HTML: ' + id); return elements[id]; }, createElement() {return new Element();}, addEventListener() {}};
const context = vm.createContext({document, console, requestJson: async (url, options) => {
    if (url === 'db_connection.php') { if (catalogFails) throw new Error('Сеть недоступна'); return centers; }
    if (url === 'save_rating.php') { postCount++; return new Promise(resolve => {postResolve = resolve;}); }
    return new Promise(resolve => pending.push({url, resolve}));
}});
vm.runInContext(fs.readFileSync(path.join(root, 'api.js'), 'utf8').replace('async function requestJson(', 'async function unusedRequestJson('), context);
vm.runInContext(fs.readFileSync(path.join(root, 'script.js'), 'utf8'), context);
const tick = () => new Promise(resolve => setImmediate(resolve));
const stats = n => ({total_reviews: n, overall_rating: n ? '4' : null, waiting_time: null});
(async () => {
    await tick();
    check(elements['trauma-center-select'].children.length === 2 && !elements['search-input'].disabled, 'catalog enables search and selection');
    check(elements.map.textContent.includes('Карта недоступна'), 'catalog works when Leaflet is unavailable');
    check(vm.runInContext('coordinates({geoData: "broken"}) === null', context), 'malformed geometry is ignored');
    check(vm.runInContext('coordinates({geoData: {type:"Point",coordinates:[181,55]}}) === null', context), 'out-of-range geometry is ignored');
    vm.runInContext('selectCenter({id: 1, ShortName:"Первый"}); selectCenter({id: 2, ShortName:"Второй"});', context);
    pending[1].resolve(stats(2));
    await tick();
    pending[0].resolve(stats(1));
    await tick();
    check(elements['stat-total-reviews'].textContent === 2, 'late response cannot overwrite the selected center statistics');
    check(elements['stat-overall-rating'].textContent === '4.00 / 5', 'ratings display their scale');
    vm.runInContext('loadStatistics(2)', context);
    pending[2].resolve(stats(0));
    await tick();
    check(elements['stat-total-reviews'].textContent === 0 && elements['statistics-status'].textContent.includes('нет отзывов'), 'zero reviews have a clear empty state');
    elements['search-input'].value = 'травмпункт';
    elements['search-input'].listeners.input();
    check(elements.suggestions.children.length === 2, 'search displays matching centers');
    elements['search-input'].listeners.keydown({key:'ArrowDown',preventDefault(){}});
    check(elements['search-input'].attributes['aria-activedescendant'] === 'suggestion-0', 'arrow key activates the first suggestion');
    elements['search-input'].listeners.keydown({key:'Enter',preventDefault(){}});
    check(Number(elements['trauma-center-select'].value) === 1 && elements.suggestions.hidden, 'Enter selects and closes suggestions');
    // Resolve the selected center request before testing form submission.
    pending[3].resolve(stats(0));
    await tick();
    elements['trauma-center-select'].value = '1';
    for (const id of ['waiting-time','professionalism','politeness','clarity','cleanliness','visit-time']) elements[id].value = '5';
    const submission = elements['survey-form'].listeners.submit({preventDefault(){}});
    await elements['survey-form'].listeners.submit({preventDefault(){}});
    check(postCount === 1 && elements['survey-form'].button.disabled, 'double click sends only one request');
    postResolve({success:true});
    await tick();
    pending[4].resolve(stats(1));
    await submission;
    check(elements['survey-form'].wasReset && !elements['survey-form'].button.disabled && elements['survey-status'].textContent.includes('сохранена'), 'successful save resets the form and restores the button');
    vm.runInContext('selectCenter(undefined)', context);
    check(elements['trauma-center-info'].hidden && elements.statistics.hidden && elements['survey-form'].button.disabled, 'clearing selection hides details and disables submit');
    catalogFails = true;
    await vm.runInContext('loadCenters()', context);
    check(!elements['retry-load'].hidden && elements['load-status'].textContent === 'Сеть недоступна', 'catalog errors show a retry action');
    const apiContext = vm.createContext({fetch: async () => ({ok: false,json:async()=>({error:'Неверная оценка'})})});
    vm.runInContext(fs.readFileSync(path.join(root, 'api.js'), 'utf8'), apiContext);
    await assert.rejects(vm.runInContext('requestJson("save_rating.php")',apiContext), /Неверная оценка/);
    checks++; console.log('PASS: API error message reaches the interface');
    apiContext.fetch = async () => ({ok:true,json:async()=>{throw new Error('bad JSON');}});
    await assert.rejects(vm.runInContext('requestJson("db_connection.php")',apiContext), /некорректный ответ/);
    checks++; console.log('PASS: malformed server response has a readable error');
    console.log(`\n${checks} checks passed.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
