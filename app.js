const API = 'https://api.escuelajs.co/api/v1/products';

let products = [];
let filtered = [];
let currentPage = 1;
let pageSize = 10;
let sortKey = null;
let sortDir = 1; // 1 asc, -1 desc

const els = {
  tbody: document.querySelector('#productsTable tbody'),
  search: document.getElementById('searchInput'),
  pageSize: document.getElementById('pageSizeSelect'),
  pagination: document.getElementById('pagination'),
  countInfo: document.getElementById('countInfo'),
  exportCsv: document.getElementById('exportCsv'),
  openCreate: document.getElementById('openCreate'),
};

async function fetchProducts() {
  try {
    const r = await fetch(API);
    products = await r.json();
    applyFilterAndRender();
  } catch (e) {
    console.error('Fetch products failed', e);
  }
}

function applyFilterAndRender() {
  const q = els.search.value.trim().toLowerCase();
  filtered = products.filter(p => p.title.toLowerCase().includes(q));
  if (sortKey) {
    filtered.sort((a,b)=>{
      const va = (sortKey==='price') ? Number(a.price) : (a[sortKey] || '').toString().toLowerCase();
      const vb = (sortKey==='price') ? Number(b.price) : (b[sortKey] || '').toString().toLowerCase();
      if (va < vb) return -1 * sortDir;
      if (va > vb) return 1 * sortDir;
      return 0;
    });
  }
  els.countInfo.textContent = filtered.length;
  renderTable();
  renderPagination();
}

function renderTable() {
  els.tbody.innerHTML = '';
  const start = (currentPage-1)*pageSize;
  const pageItems = filtered.slice(start, start+pageSize);
  for (const p of pageItems) {
    const tr = document.createElement('tr');
    tr.dataset.id = p.id;
    tr.setAttribute('data-bs-toggle','tooltip');
    tr.setAttribute('title', p.description || '');

    const imgSrc = (p.images && p.images.length) ? p.images[0] : '';

    tr.innerHTML = `
      <td>${p.id}</td>
      <td>${escapeHtml(p.title)}</td>
      <td>${p.price}</td>
      <td>${p.category && p.category.name ? escapeHtml(p.category.name) : (p.category || '')}</td>
      <td>${imgSrc ? `<img src="${escapeAttr(imgSrc)}" class="thumb"/>` : ''}</td>
    `;

    tr.addEventListener('click', ()=> openDetail(p.id));
    els.tbody.appendChild(tr);
  }
  // init tooltips for rows
  const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
  tooltipTriggerList.forEach(function (tooltipTriggerEl) {
    new bootstrap.Tooltip(tooltipTriggerEl);
  });
}

function renderPagination(){
  els.pagination.innerHTML = '';
  const total = Math.ceil(Math.max(filtered.length,1)/pageSize);
  function pageItem(i, label = null) {
    const li = document.createElement('li');
    li.className = 'page-item' + (i===currentPage? ' active':'');
    const a = document.createElement('a');
    a.className = 'page-link';
    a.href = '#';
    a.textContent = label || i;
    a.addEventListener('click', (e)=>{ e.preventDefault(); currentPage = i; renderTable(); renderPagination(); });
    li.appendChild(a);
    return li;
  }
  const prev = document.createElement('li');
  prev.className = 'page-item' + (currentPage===1? ' disabled':'');
  const pa = document.createElement('a'); pa.className='page-link'; pa.href='#'; pa.textContent='Prev'; pa.addEventListener('click', e=>{e.preventDefault(); if(currentPage>1){currentPage--; renderTable(); renderPagination();}});
  prev.appendChild(pa); els.pagination.appendChild(prev);

  for (let i=1;i<=total;i++){ els.pagination.appendChild(pageItem(i)); }

  const next = document.createElement('li');
  next.className = 'page-item' + (currentPage===total? ' disabled':'');
  const na = document.createElement('a'); na.className='page-link'; na.href='#'; na.textContent='Next'; na.addEventListener('click', e=>{e.preventDefault(); if(currentPage<total){currentPage++; renderTable(); renderPagination();}});
  next.appendChild(na); els.pagination.appendChild(next);
}

function escapeHtml(s){ return (s+'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }
function escapeAttr(s){ return (s+'').replaceAll('"','&quot;'); }

// Sorting buttons
document.querySelectorAll('[data-sort-key]').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    const key = btn.dataset.sortKey;
    if (sortKey === key) sortDir = -sortDir; else { sortKey = key; sortDir = 1; }
    applyFilterAndRender();
  });
});

els.search.addEventListener('input', ()=>{ currentPage=1; applyFilterAndRender(); });
els.pageSize.addEventListener('change', ()=>{ pageSize = Number(els.pageSize.value); currentPage=1; renderTable(); renderPagination(); });

els.exportCsv.addEventListener('click', ()=>{
  const start = (currentPage-1)*pageSize;
  const rows = filtered.slice(start, start+pageSize);
  const header = ['id','title','price','category','images','description'];
  const csv = [header.join(',')].concat(rows.map(r=>{
    const cat = r.category && r.category.name ? r.category.name : (r.category || '');
    const imgs = (r.images && r.images.length) ? r.images.join('|') : '';
    return [r.id, quote(r.title), r.price, quote(cat), quote(imgs), quote(r.description)].join(',');
  })).join('\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'products_page.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
});

function quote(s){ if (s==null) return '""'; return '"'+(s+'').replaceAll('"','""')+'"'; }

// Detail modal
const detailModal = new bootstrap.Modal(document.getElementById('detailModal'));
async function openDetail(id){
  try{
    const r = await fetch(`${API}/${id}`);
    const p = await r.json();
    document.getElementById('detailId').value = p.id;
    document.getElementById('detailTitle').value = p.title || '';
    document.getElementById('detailPrice').value = p.price || 0;
    document.getElementById('detailDescription').value = p.description || '';
    document.getElementById('detailCategory').value = p.category && p.category.name ? p.category.name : (p.category || '');
    document.getElementById('detailImage').value = (p.images && p.images[0]) || '';
    detailModal.show();
  }catch(e){ console.error(e); }
}

document.getElementById('saveDetail').addEventListener('click', async ()=>{
  const id = document.getElementById('detailId').value;
  const payload = {
    title: document.getElementById('detailTitle').value,
    price: Number(document.getElementById('detailPrice').value)||0,
    description: document.getElementById('detailDescription').value,
    images: [document.getElementById('detailImage').value].filter(Boolean),
  };
  try{
    const res = await fetch(`${API}/${id}`, { method: 'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)});
    if(!res.ok) throw new Error('Update failed');
    const updated = await res.json();
    // update local list
    const idx = products.findIndex(x=>x.id==updated.id);
    if(idx>=0) products[idx] = updated;
    applyFilterAndRender();
    detailModal.hide();
  }catch(e){ alert('Update failed: '+e.message); }
});

// Create modal
const createModal = new bootstrap.Modal(document.getElementById('createModal'));
document.getElementById('openCreate').addEventListener('click', ()=> createModal.show());
document.getElementById('createSave').addEventListener('click', async ()=>{
  const payload = {
    title: document.getElementById('createTitle').value,
    price: Number(document.getElementById('createPrice').value)||0,
    description: document.getElementById('createDescription').value,
    categoryId: Number(document.getElementById('createCategoryId').value) || 1,
    images: [document.getElementById('createImage').value].filter(Boolean),
  };
  try{
    const res = await fetch(API, { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)});
    if(!res.ok) throw new Error('Create failed');
    const created = await res.json();
    products.unshift(created);
    applyFilterAndRender();
    createModal.hide();
    document.getElementById('createForm').reset();
  }catch(e){ alert('Create failed: '+e.message); }
});

// Helpers
function init(){
  fetchProducts();
}

init();
