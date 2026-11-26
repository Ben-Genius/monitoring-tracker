/**
 * Shared behaviour for the public pages (Home, Features, Pricing): small
 * helpers that work without motion, then GSAP entrances and scroll effects.
 * Every effect checks its elements exist, since each page has different parts.
 * Plain JS on purpose: these pages load none of the app's code.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const root = document.documentElement;
// Development builds only: lets a test step animations forward from the console.
if (import.meta.env.DEV) Object.assign(window, { gsap, ScrollTrigger });
const $$ = (sel, r = document) => Array.from(r.querySelectorAll(sel));
const motion = root.classList.contains('js');

// ---- Helpers that don't depend on motion

// Signed in already (Supabase keeps the session in localStorage)? Offer the app instead of a login.
try {
    if (Object.keys(localStorage).some(k => /^sb-.*-auth-token$/.test(k))) {
        $$('[data-login]').forEach(a => { a.textContent = 'Open Commit'; });
    }
} catch { /* storage blocked: keep "Log in" */ }

// No sales contact configured: send paid-plan interest to sign-up instead.
$$('[data-sales]').forEach(a => {
    if (!/^(mailto:|https:\/\/)/.test(a.getAttribute('href') || '')) {
        a.setAttribute('href', '/start');
        a.textContent = 'Start free, upgrade later';
    }
});
$$('[data-year]').forEach(el => { el.textContent = String(new Date().getFullYear()); });

// Tabs: click or arrow keys. While on screen and untouched they cycle, with a
// thin bar showing the time to the next one.
$$('[data-tabs]').forEach(box => {
    const tabs = $$('[role="tab"]', box);
    const bar = box.querySelector('.tab-prog');
    let current = 0, stopped = !motion, visible = false, cycle = null;
    const run = () => {
        cycle?.kill();
        if (!bar) return;
        const t = tabs[current];
        gsap.set(bar, { x: t.offsetLeft, width: t.offsetWidth, scaleX: 0 });
        if (stopped || !visible) return;
        cycle = gsap.to(bar, { scaleX: 1, duration: 3.6, ease: 'none', onComplete: () => pick((current + 1) % tabs.length) });
    };
    const pick = (i, focus) => {
        current = i;
        tabs.forEach((t, j) => {
            const on = j === i;
            t.setAttribute('aria-selected', String(on));
            t.tabIndex = on ? 0 : -1;
            document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
        });
        if (focus) tabs[i].focus();
        if (motion) gsap.fromTo('#' + tabs[i].getAttribute('aria-controls'), { autoAlpha: 0, y: 6 }, { autoAlpha: 1, y: 0, duration: .35, ease: 'power3.out' });
        run();
    };
    const stop = () => { stopped = true; cycle?.kill(); if (bar) bar.style.opacity = '0'; };
    tabs.forEach((t, i) => {
        t.addEventListener('click', () => { stop(); pick(i); });
        t.addEventListener('keydown', e => {
            const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
            if (d) { e.preventDefault(); stop(); pick((i + d + tabs.length) % tabs.length, true); }
        });
    });
    new IntersectionObserver(es => { visible = es[0].isIntersecting; run(); }).observe(box);
});

// Pause looping decoration while it's off screen.
const pauser = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('paused', !e.isIntersecting)));
$$('.feed, .toast').forEach(el => pauser.observe(el));

// Spotlight that follows the pointer across feature cells.
$$('.cell').forEach(c => c.addEventListener('pointermove', e => {
    const r = c.getBoundingClientRect();
    c.style.setProperty('--mx', `${e.clientX - r.left}px`);
    c.style.setProperty('--my', `${e.clientY - r.top}px`);
}));

// ---- Motion
if (motion) {
    gsap.registerPlugin(ScrollTrigger);
    animate();
    window.__commitMotion = true;
}

function animate() {
    const ease = 'power4.out';
    const has = sel => document.querySelector(sel) !== null;

    // Wrap each word in a mask so it can rise into place. Screen readers get the plain heading.
    const split = el => {
        el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
        const walk = node => {
            Array.from(node.children).forEach(walk);
            Array.from(node.childNodes).forEach(n => {
                if (n.nodeType !== 3 || !n.textContent.trim()) return;
                const frag = document.createDocumentFragment();
                n.textContent.split(/(\s+)/).forEach(part => {
                    if (!part) return;
                    if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
                    const w = document.createElement('span'); w.className = 'w'; w.setAttribute('aria-hidden', 'true');
                    const i = document.createElement('span'); i.textContent = part;
                    w.appendChild(i); frag.appendChild(w);
                });
                node.replaceChild(frag, n);
            });
        };
        walk(el);
        return $$('.w > span', el);
    };
    // Add a tween only when its targets exist on this page.
    const from = (tl, targets, vars, pos) => {
        const els = typeof targets === 'string' ? $$(targets) : targets;
        if (els.length) tl.from(els, vars, tl.duration() ? pos : 0);
    };

    // ---- First screen: the hero (Home) or the page heading (Features, Pricing)
    const first = document.querySelector('.hero, .page-head');
    if (first) {
        const h1 = first.querySelector('h1');
        const words = h1 ? split(h1) : [];
        gsap.set([h1, ...$$('[data-in]', first), ...$$('.window', first)].filter(Boolean), { visibility: 'visible' });
        const tl = gsap.timeline({ defaults: { ease } });
        from(tl, $$('.label[data-in]', first), { autoAlpha: 0, y: 12, duration: .6 });
        from(tl, words, { yPercent: 110, duration: 1, stagger: .045 }, '<.1');
        from(tl, $$('.lead', first), { autoAlpha: 0, y: 18, duration: .8 }, '-=.7');
        from(tl, $$('.ctas > *', first), { autoAlpha: 0, y: 14, duration: .7, stagger: .08 }, '-=.6');
        from(tl, $$('.tabs', first), { autoAlpha: 0, y: 14, duration: .7 }, '-=.55');
        if (has('.window')) {
            tl.from('.window', { autoAlpha: 0, y: 48, scale: .965, duration: 1.2, ease: 'expo.out' }, .25)
                .from('.win-tabs span', { autoAlpha: 0, duration: .4, stagger: .05 }, .7)
                .from('.meter i', { scaleX: 0, transformOrigin: 'left', duration: 1.2, ease: 'power3.inOut' }, .8)
                .from('[data-count]', { textContent: 0, snap: { textContent: 1 }, duration: 1.2, ease: 'power3.inOut' }, .8)
                .from('.tl .bar', { scaleX: 0, transformOrigin: 'left', duration: .9, stagger: .09, ease: 'power3.out' }, .9)
                .from('.tl .today', { scaleY: 0, transformOrigin: 'top', duration: .8, ease: 'power2.inOut' }, 1.2)
                .from('.toast', { autoAlpha: 0, y: 14, scale: .98, duration: .7, ease: 'back.out(1.6)' }, 1.6);
            // The window drifts up as you scroll past the hero.
            gsap.to('.window', { yPercent: -8, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 1 } });
        }
    }

    // ---- Header: reading progress, and a shadow once the page moves.
    const header = document.querySelector('header.site');
    if (has('.progress')) gsap.to('.progress', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: .3 } });
    if (header) ScrollTrigger.create({ start: 8, end: 'max', onToggle: s => header.classList.toggle('scrolled', s.isActive) });

    // ---- Section heads and the closing call
    $$('.head, .closing').forEach(head => {
        const h2 = head.querySelector('h2');
        const tl = gsap.timeline({ defaults: { ease }, scrollTrigger: { trigger: head, start: 'top 82%', once: true } });
        from(tl, $$('.label', head), { autoAlpha: 0, x: -10, duration: .6 });
        from(tl, h2 ? split(h2) : [], { yPercent: 110, duration: .9, stagger: .035 }, '<.05');
        from(tl, $$(':scope > p:not(.label)', head), { autoAlpha: 0, y: 16, duration: .8, stagger: .1 }, '-=.6');
        from(tl, $$('.ctas > *', head), { autoAlpha: 0, y: 14, duration: .7, stagger: .08 }, '-=.6');
    });
    if (has('.closing h2')) {
        gsap.fromTo('.closing h2', { scale: .92 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.closing', start: 'top bottom', end: 'center center', scrub: 1 } });
    }

    // ---- Feature cells: rise in batches, then their pictures play.
    if (has('.cell')) {
        gsap.set('.cell', { autoAlpha: 0, y: 40 });
        ScrollTrigger.batch('.cell', {
            start: 'top 88%', once: true,
            onEnter: cells => {
                gsap.to(cells, { autoAlpha: 1, y: 0, duration: .9, stagger: .1, ease });
                cells.forEach((c, i) => play(c, .35 + i * .1));
            },
        });
    }
    if (has('.more')) gsap.from('.more', { autoAlpha: 0, duration: .8, scrollTrigger: { trigger: '.more', start: 'top 95%', once: true } });

    // ---- Accountability: the rules list, then the rules file "types" in line by line.
    if (has('.points')) gsap.from('.points li', { autoAlpha: 0, y: 14, stagger: .08, duration: .6, ease, scrollTrigger: { trigger: '.points', start: 'top 85%', once: true } });
    const pre = document.querySelector('.code pre');
    if (pre) {
        pre.innerHTML = pre.innerHTML.split('\n').map(l => `<span class="ln">${l || ' '}</span>`).join('');
        gsap.from('.code', { autoAlpha: 0, y: 30, duration: 1, ease, scrollTrigger: { trigger: '.code', start: 'top 85%', once: true } });
        gsap.from($$('.ln', pre), { autoAlpha: 0, x: -8, stagger: .07, duration: .35, ease: 'power2.out', scrollTrigger: { trigger: '.code', start: 'top 75%', once: true } });
    }

    // ---- Steps, plans, questions
    [['.steps > li', .12], ['.plan', .12], ['.faq details', .06]].forEach(([sel, stagger]) => {
        const els = $$(sel);
        if (!els.length) return;
        gsap.from(els, { autoAlpha: 0, y: 28, stagger, duration: .8, ease, scrollTrigger: { trigger: els[0].parentNode, start: 'top 85%', once: true } });
    });
    if (has('.plan .price')) gsap.from('.plan .price', { yPercent: 40, autoAlpha: 0, stagger: .12, duration: 1, ease, scrollTrigger: { trigger: '.plans', start: 'top 80%', once: true } });

    // Layout settles once fonts arrive.
    document.fonts?.ready.then(() => ScrollTrigger.refresh());
}

// Each feature cell's small picture plays once its cell is in view.
function play(c, delay) {
    const tl = gsap.timeline({ delay, defaults: { ease: 'power3.out' } });
    const q = s => $$(s, c);
    if (q('.chips').length) tl.from(q('.chip'), { autoAlpha: 0, y: 8, stagger: .06, duration: .4 }).from(q('.cols i'), { autoAlpha: 0, scaleX: .4, transformOrigin: 'left', stagger: .05, duration: .4 }, '-=.2');
    if (q('.task').length) tl.from(q('.task'), { autoAlpha: 0, y: 12, duration: .6 }).from(q('.go'), { scale: .94, autoAlpha: 0, duration: .5, ease: 'back.out(2)' }, '-=.2');
    if (q('.chat').length) tl.from(q('.chat p'), { autoAlpha: 0, y: 10, scale: .96, transformOrigin: 'right bottom', stagger: .45, duration: .5, ease: 'back.out(1.8)' });
    if (q('.stack').length) tl.from(q('.stack span'), { autoAlpha: 0, x: -10, stagger: .07, duration: .4 }).from(q('.mention'), { autoAlpha: 0, y: 10, duration: .5 }, '-=.1');
    if (q('.ladder').length) tl.from(q('.ladder li'), { autoAlpha: 0, x: -14, stagger: .22, duration: .5 }).from(q('.ladder li.hot .s'), { autoAlpha: 0, scale: .6, duration: .4, ease: 'back.out(3)' });
    if (q('.deps').length) tl.from(q('.deps > div'), { autoAlpha: 0, y: 10, stagger: .25, duration: .5 }).from(q('.deps .ar'), { autoAlpha: 0, x: -8, duration: .4 }, '-=.35').from(q('.repeat'), { autoAlpha: 0, duration: .5 });
    if (q('.load').length) tl.from(q('.load .b i'), { scaleX: 0, transformOrigin: 'left', stagger: .1, duration: .9, ease: 'power3.inOut' }).from(q('.busy'), { autoAlpha: 0, scale: .7, duration: .35, ease: 'back.out(3)' }, '-=.3');
    if (q('.orgs').length) tl.from(q('.orgs span'), { autoAlpha: 0, scale: .7, stagger: .08, duration: .45, ease: 'back.out(2.2)' }).from(q('.roles .chip'), { autoAlpha: 0, y: 6, stagger: .05, duration: .35 }, '-=.2');
}
