

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyALNOhmqoakZZLqg08-yT5DwlL0uN4RRKY",
  authDomain: "pio-xii-chat.firebaseapp.com",
  projectId: "pio-xii-chat",
  storageBucket: "pio-xii-chat.firebasestorage.app",
  messagingSenderId: "354111965765",
  appId: "1:354111965765:web:4f6bf0f1acb3cbc444b12c"
};

const IS_CONFIGURED = !FIREBASE_CONFIG.apiKey.startsWith('SUA_');
let app, auth, db;

if (IS_CONFIGURED) {
  try {
    app = firebase.initializeApp(FIREBASE_CONFIG);
    auth = firebase.auth();
    db = firebase.firestore();
  } catch(e) { console.warn('Firebase error:', e); }
} else {
  document.getElementById('config-banner').style.display = 'block';
  document.getElementById('navbar').style.top = '42px';
  initDemoMode();
}

let currentUser = null;
const commentInput = document.getElementById('comment-input');
const submitBtn = document.getElementById('submit-btn');
const charCount = document.getElementById('char-count');
const errorMsg = document.getElementById('error-msg');
const commentForm = document.getElementById('comment-form');
const authPrompt = document.getElementById('auth-prompt');
const userBar = document.getElementById('user-bar');

document.getElementById('google-btn').addEventListener('click', async () => {
  if (!IS_CONFIGURED) { demoLogin(); return; }
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    await auth.signInWithPopup(provider);
  } catch(e) { showError('Falha ao entrar: ' + e.message); }
});

document.getElementById('sign-out-btn').addEventListener('click', async () => {
  if (!IS_CONFIGURED) { onUserChange(null); showToast('Sessao encerrada'); return; }
  await auth.signOut();
  showToast('Sessao encerrada');
});

function onUserChange(user) {
  currentUser = user;
  if (user) {
    authPrompt.style.display = 'none';
    userBar.classList.add('visible');
    commentForm.classList.add('visible');
    const ac = document.getElementById('user-avatar-container');
    if (user.photoURL) {
      ac.innerHTML = '<img src="' + user.photoURL + '" class="user-avatar" alt="avatar">';
    } else {
      const ini = (user.displayName || 'U').split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase();
      ac.innerHTML = '<div class="user-avatar-fallback">' + ini + '</div>';
    }
    document.getElementById('user-name').textContent = user.displayName || user.email || 'Usuario';
  } else {
    authPrompt.style.display = 'block';
    userBar.classList.remove('visible');
    commentForm.classList.remove('visible');
  }
}

if (IS_CONFIGURED && auth) auth.onAuthStateChanged(onUserChange);

commentInput.addEventListener('input', () => {
  const l = commentInput.value.length;
  charCount.textContent = l + ' / 800';
  charCount.style.color = l > 720 ? '#e8a0a0' : 'var(--muted)';
});

submitBtn.addEventListener('click', async () => {
  const text = commentInput.value.trim();
  if (!text || text.length < 5) { showError('Por favor, escreva um comentario valido.'); return; }
  if (!currentUser) { showError('Faca login para comentar.'); return; }
  submitBtn.disabled = true;
  submitBtn.textContent = 'Publicando...';
  hideError();
  if (!IS_CONFIGURED) { demoAddComment(text); return; }
  try {
    await db.collection('comments').add({
      text,
      authorName: currentUser.displayName || 'Anonimo',
      authorPhoto: currentUser.photoURL || '',
      authorUid: currentUser.uid,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    commentInput.value = '';
    charCount.textContent = '0 / 800';
    showToast('Comentário publicado!');
  } catch(e) {
    showError('Erro ao publicar: ' + e.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Publicar comentário';
  }
});

function loadComments() {
  if (!IS_CONFIGURED || !db) return;
  db.collection('comments').orderBy('createdAt', 'desc').limit(50)
    .onSnapshot(snapshot => {
      document.getElementById('loading-comments').style.display = 'none';
      const list = document.getElementById('comments-list');
      const nc = document.getElementById('no-comments');
      if (snapshot.empty) { nc.style.display = 'block'; list.innerHTML = ''; return; }
      nc.style.display = 'none';
      list.innerHTML = '';
      snapshot.forEach(doc => list.appendChild(buildComment(doc.data())));
    }, err => {
      document.getElementById('loading-comments').style.display = 'none';
      showError('Não foi possível carregar comentários.');
      console.error(err);
    });
}

function buildComment(data) {
  const el = document.createElement('div');
  el.className = 'comment-item';
  const t = data.createdAt && data.createdAt.toDate ? fmtDate(data.createdAt.toDate()) : 'Agora mesmo';
  const av = data.authorPhoto
    ? '<img src="' + data.authorPhoto + '" class="comment-avatar" alt="">'
    : '<div class="comment-avatar" style="background:var(--gold-dim);display:flex;align-items:center;justify-content:center;font-family:Cinzel,serif;font-size:0.75rem;color:var(--cream);font-weight:600;">' + (data.authorName||'A')[0] + '</div>';
  el.innerHTML = '<div class="comment-header">' + av + '<div class="comment-meta"><span class="comment-author">' + esc(data.authorName||'Anônimo') + '</span><span class="comment-time">' + t + '</span></div></div><p class="comment-body">' + esc(data.text) + '</p>';
  return el;
}

function fmtDate(d) {
  const diff = Math.floor((Date.now() - d) / 1000);
  if (diff < 60) return 'agora mesmo';
  if (diff < 3600) return Math.floor(diff/60) + ' min atrás';
  if (diff < 86400) return Math.floor(diff/3600) + 'h atrás';
  return d.toLocaleDateString('pt-BR', {day:'2-digit', month:'short', year:'numeric'});
}

function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function showError(m) { errorMsg.textContent = m; errorMsg.style.display = 'block'; }
function hideError() { errorMsg.style.display = 'none'; }

let toastT;
function showToast(m) {
  const t = document.getElementById('toast');
  t.textContent = m; t.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove('show'), 3200);
}

function initDemoMode() {
  document.getElementById('loading-comments').style.display = 'none';
  const seeds = [
    { authorName: 'Maria Santos', authorPhoto: '', text: 'Um pontificado extraordinario. A postura do Papa durante a guerra ainda divide opinioes, mas e inegavel sua obra humanitaria e sua coragem diplomatica.', createdAt: { toDate: () => new Date(Date.now() - 7200000) } },
    { authorName: 'Joao Ferreira', authorPhoto: '', text: 'A encíclica Mystici Corporis de 1943 e uma das mais belas reflexoes sobre a Igreja como Corpo de Cristo. Pio XII foi um teologo de primeira grandeza.', createdAt: { toDate: () => new Date(Date.now() - 86400000) } }
  ];
  const list = document.getElementById('comments-list');
  document.getElementById('no-comments').style.display = 'none';
  seeds.forEach(c => list.appendChild(buildComment(c)));
}

function demoLogin() {
  onUserChange({ displayName: 'Usuario Demo', photoURL: '', uid: 'demo', email: 'demo@demo.com' });
  showToast('Modo demo ativo — configure Firebase para persistencia');
}

function demoAddComment(text) {
  const list = document.getElementById('comments-list');
  document.getElementById('no-comments').style.display = 'none';
  list.prepend(buildComment({ text, authorName: currentUser.displayName || 'Voce', authorPhoto: '', createdAt: { toDate: () => new Date() } }));
  commentInput.value = '';
  charCount.textContent = '0 / 800';
  showToast('Comentario publicado!');
  submitBtn.disabled = false;
  submitBtn.textContent = 'Publicar comentario';
}

const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => navbar.classList.toggle('scrolled', scrollY > 60));

const obs = new IntersectionObserver((entries) => {
  entries.forEach((e, i) => {
    if (e.isIntersecting) setTimeout(() => e.target.classList.add('visible'), i * 80);
  });
}, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });

document.querySelectorAll('.timeline-item, .legacy-card').forEach(el => obs.observe(el));

if (IS_CONFIGURED) loadComments();

