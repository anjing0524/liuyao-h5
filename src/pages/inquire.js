/**
 * src/pages/inquire.js — 静心占问
 *
 * 用户输入问题 + 选分类（可选），点"开始摇卦"进入摇卦页。
 * 数据存 localStorage，cast 页读取。
 */

import { set, KEY_CURRENT_QUESTION } from '../utils/storage.js';

const CATEGORIES = ['事业', '感情', '财运', '健康', '学业', '其他'];
const EXAMPLES = [
  '想问：下个月换工作能否顺利？',
  '想问：这段感情会走向何方？',
  '想问：最近投资是否合适？',
  '想问：家人健康近况如何？'
];

const state = { question: '', category: '' };

export function mountInquire() {
  const page = document.getElementById('page-inquire');
  const ta = page.querySelector('#inquire-question');
  const catsEl = page.querySelector('#inquire-cats');
  const examplesEl = page.querySelector('#inquire-examples');

  // 渲染分类
  catsEl.innerHTML = CATEGORIES.map(c =>
    `<button type="button" class="cat" data-cat="${c}">${c}</button>`
  ).join('');

  // 渲染示例
  examplesEl.innerHTML = EXAMPLES.map(t =>
    `<button type="button" class="example" data-txt="${t}">${t}</button>`
  ).join('');

  function renderCats() {
    catsEl.querySelectorAll('.cat').forEach(el => {
      el.classList.toggle('active', el.dataset.cat === state.category);
    });
  }

  function onCatsClick(e) {
    const btn = e.target.closest('.cat');
    if (!btn) return;
    state.category = state.category === btn.dataset.cat ? '' : btn.dataset.cat;
    renderCats();
  }

  function onExamplesClick(e) {
    const btn = e.target.closest('.example');
    if (!btn) return;
    state.question = btn.dataset.txt;
    ta.value = state.question;
  }

  function onInput() {
    state.question = ta.value;
  }

  function onStart() {
    const q = (state.question || '').trim();
    if (q.length < 4) {
      alert('请把想问的事说具体一些（至少 4 个字）');
      return;
    }
    set(KEY_CURRENT_QUESTION, {
      question: q,
      category: state.category,
      createdAt: Date.now()
    });
    location.hash = '#cast';
  }

  function onClear() {
    state.question = '';
    state.category = '';
    ta.value = '';
    renderCats();
  }

  // 复用 click 委托
  function onClick(e) {
    const a = e.target.closest('[data-action]')?.dataset.action;
    if (a === 'inquireStart') return onStart();
    if (a === 'inquireClear') return onClear();
    if (e.target.closest('.cat')) return onCatsClick(e);
    if (e.target.closest('.example')) return onExamplesClick(e);
  }

  page.addEventListener('click', onClick);
  ta.addEventListener('input', onInput);

  // 还原上次输入（如果有）
  // 不还原 question（占问必须由用户主动明确），但 category 可保留
  state.category = '';

  return () => {
    page.removeEventListener('click', onClick);
    ta.removeEventListener('input', onInput);
  };
}