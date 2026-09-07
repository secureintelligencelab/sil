/* =====================================================================
   EVENTS + AUTH  (Supabase-powered)
   ---------------------------------------------------------------------
   - Public visitors: see APPROVED events (read from the database).
   - Registered contributors (anyone who creates an account):
        submit new events, edit/delete their OWN, and only see their own
        pending submissions (never other people's).
   - Admin (ashraf.uddin@cihe.edu.au):
        edit / delete / approve / reject ANY event.

   Requires: supabase-js v2 (loaded in index.html) and supabase-config.js
   ===================================================================== */

(function () {
  // ---- helpers --------------------------------------------------------
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fmtDate(iso) {
    if (!iso) return '';
    var d = new Date(iso + 'T00:00:00');
    if (isNaN(d)) return iso;
    return d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
  }

  // ---- Supabase client ------------------------------------------------
  var sb = null;
  try {
    if (window.supabase && typeof SUPABASE_URL !== 'undefined') {
      sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    }
  } catch (e) { console.warn('Supabase init failed', e); }

  var currentUser = null;        // the logged-in user object (or null)
  function userEmail() { return currentUser ? (currentUser.email || '') : ''; }
  function isAdmin() { return userEmail().toLowerCase() === String(ADMIN_EMAIL).toLowerCase(); }

  // =====================================================================
  //  RENDER EVENTS  (replaces the old static renderEvents)
  // =====================================================================
  var eventsList = document.getElementById('eventsList');

  // map a DB row to the shape the card builder expects
  function rowToEvent(r) {
    var topics = [];
    if (r.description) topics.push(r.description);
    if (r.speaker_info) topics.push('Speaker: ' + r.speaker_info);
    if (r.is_sponsored) topics.push('Sponsored' + (r.sponsor_info ? ' — ' + r.sponsor_info : ''));
    return {
      id: r.id,
      type: r.type || 'Event',
      title: r.title,
      speaker: r.speaker || '',
      date: r.event_date,
      time: r.event_time || '',
      location: r.location || '',
      topics: topics,
      link: r.link || '',
      linkText: r.link_text || '',
      status: r.status,
      submitted_by: r.submitted_by
    };
  }

  function buildEvent(ev, isPast) {
    var topics = (ev.topics && ev.topics.length)
      ? '<div class="event-topics"><div class="lbl">Details</div><ul>' +
        ev.topics.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul></div>'
      : '';
    var meta = [
      '<div class="row"><i class="fas fa-calendar-day"></i><span>' + esc(fmtDate(ev.date)) + '</span></div>',
      ev.time ? '<div class="row"><i class="fas fa-clock"></i><span>' + esc(ev.time) + '</span></div>' : '',
      ev.location ? '<div class="row"><i class="fas fa-location-dot"></i><span>' + esc(ev.location) + '</span></div>' : '',
      ev.speaker ? '<div class="row"><i class="fas fa-user"></i><span>' + esc(ev.speaker) + '</span></div>' : ''
    ].join('');
    var cta = '';
    if (ev.link) {
      var label = ev.linkText || (isPast ? 'View Recording' : 'Register');
      var icon = isPast ? 'fa-arrow-up-right-from-square' : 'fa-pen-to-square';
      cta = '<div class="event-cta"><a class="event-join" href="' + esc(ev.link) + '" target="_blank" rel="noopener"><i class="fas ' + icon + '"></i>' + esc(label) + '</a></div>';
    }
    // status badge (only meaningful for logged-in users seeing pending items)
    var statusPill = '';
    if (ev.status && ev.status !== 'approved') {
      statusPill = '<span class="event-status ' + esc(ev.status) + '">' + esc(ev.status) + '</span>';
    }
    var pill = isPast ? 'Past event' : 'Upcoming';
    return '<div class="event ' + (isPast ? 'past' : 'upcoming') + ' reveal in" data-ev="' + (isPast ? 'past' : 'upcoming') + '">' +
      '<div class="event-top">' +
      '<span class="event-type">' + esc(ev.type || 'Event') + '</span>' +
      statusPill +
      '<span class="event-when-pill">' + pill + '</span>' +
      '</div>' +
      '<h3>' + esc(ev.title) + '</h3>' +
      (ev.speaker ? '<p class="speaker">' + esc(ev.speaker) + '</p>' : '') +
      '<div class="event-meta">' + meta + '</div>' +
      topics + cta +
      '</div>';
  }

  var _cache = null; // last fetched events (array of mapped events)

  function getEvents() {
    // If Supabase is up, read from DB; otherwise fall back to static EVENTS.
    if (!sb) {
      return Promise.resolve((typeof EVENTS !== 'undefined' ? EVENTS.slice() : []));
    }
    // RLS returns approved for everyone, plus own/pending for logged-in users.
    return sb.from('events').select('*').order('event_date', { ascending: true })
      .then(function (res) {
        if (res.error) { console.warn(res.error); return (typeof EVENTS !== 'undefined' ? EVENTS.slice() : []); }
        return (res.data || []).map(rowToEvent);
      });
  }

  function renderEvents(filter) {
    if (!eventsList) return;
    Promise.resolve(_cache || getEvents()).then(function (data) {
      _cache = data;
      var today = new Date(); today.setHours(0, 0, 0, 0);
      // Public visitors only see approved; logged-in users see all returned rows.
      var visible = data.filter(function (ev) {
        if (!ev.status) return true;                 // static fallback events
        if (ev.status === 'approved') return true;
        return currentUser != null;                  // pending shown only when logged in
      });
      var withPast = visible.map(function (ev) {
        return { ev: ev, past: (new Date(ev.date + 'T00:00:00')) < today };
      });
      var up = withPast.filter(function (x) { return !x.past; }).sort(function (a, b) { return new Date(a.ev.date) - new Date(b.ev.date); });
      var pa = withPast.filter(function (x) { return x.past; }).sort(function (a, b) { return new Date(b.ev.date) - new Date(a.ev.date); });
      var show = filter === 'upcoming' ? up : filter === 'past' ? pa : up.concat(pa);
      if (!show.length) {
        var msg = filter === 'upcoming' ? 'No upcoming events right now — check back soon.'
          : filter === 'past' ? 'No past events listed yet.' : 'No events listed yet.';
        eventsList.innerHTML = '<p class="events-empty">' + msg + '</p>';
        return;
      }
      eventsList.innerHTML = show.map(function (x) { return buildEvent(x.ev, x.past); }).join('');
    });
  }

  function refreshEvents() {
    _cache = null;
    var active = document.querySelector('.ev-tab.active');
    renderEvents(active ? active.dataset.evfilter : 'upcoming');
  }

  // wire the Upcoming/Past/All tabs
  function wireTabs() {
    document.querySelectorAll('.ev-tab').forEach(function (b) {
      b.addEventListener('click', function () {
        document.querySelectorAll('.ev-tab').forEach(function (x) { x.classList.remove('active'); });
        b.classList.add('active');
        renderEvents(b.dataset.evfilter);
      });
    });
  }

  // =====================================================================
  //  AUTH UI  (login button in nav, login modal)
  // =====================================================================
  // ---- identity helpers ----------------------------------------------
  function displayName() {
    if (!currentUser) return 'Account';
    var meta = currentUser.user_metadata || {};
    if (meta.full_name) return meta.full_name;
    var mail = userEmail();
    return mail ? mail.split('@')[0] : 'Account';
  }

  function initials(name) {
    var parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '··';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function setText(id, value) {
    var el = document.getElementById(id);
    if (el) el.textContent = value;
  }
  function setShown(id, shown) {
    var el = document.getElementById(id);
    if (el) el.hidden = !shown;
  }

  // ---- the account menu ------------------------------------------------
  function closeAcctMenu() {
    var menu = document.getElementById('acctMenu');
    var trigger = document.getElementById('acctTrigger');
    if (menu) menu.hidden = true;
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
  }

  function toggleAcctMenu() {
    var menu = document.getElementById('acctMenu');
    var trigger = document.getElementById('acctTrigger');
    if (!menu || !trigger) return;
    var open = menu.hidden;
    menu.hidden = !open;
    trigger.setAttribute('aria-expanded', String(open));
    if (open) {
      refreshPendingCount();
      var first = menu.querySelector('.acct-item');
      if (first) first.focus();
    }
  }

  // Admins get a live count of submissions waiting on them.
  function refreshPendingCount() {
    if (!sb || !isAdmin()) return;
    sb.from('events').select('id', { count: 'exact', head: true }).eq('status', 'pending')
      .then(function (res) {
        if (res.error) return;
        var n = res.count || 0;
        var el = document.getElementById('acctPending');
        if (!el) return;
        el.textContent = n;
        el.setAttribute('data-zero', String(n === 0));
      });
  }

  function updateAuthUI() {
    var signedIn = !!currentUser;
    var admin = signedIn && isAdmin();
    var name = displayName();
    var mail = userEmail();
    var role = admin ? 'Administrator' : 'Contributor';

    // header: sign-in button vs. identity chip
    setShown('authBtn', !signedIn);
    setShown('acctTrigger', signedIn);
    if (!signedIn) closeAcctMenu();

    // mobile sheet
    setShown('mobileWho', signedIn);
    setShown('authBtnMobile', !signedIn);
    setShown('acctDashMobile', signedIn);
    setShown('acctSignoutMobile', signedIn);

    if (signedIn) {
      var ini = initials(name);
      ['acctAvatar', 'acctAvatarLg', 'acctAvatarM'].forEach(function (id) {
        var el = document.getElementById(id);
        if (!el) return;
        el.textContent = ini;
        el.classList.toggle('is-admin', admin);
      });
      setText('acctName', name);
      setText('acctRole', role);
      setText('acctMenuName', name);
      setText('acctMenuMail', mail);
      setText('acctNameM', name);
      setText('acctMailM', mail);

      var badge = document.getElementById('acctBadge');
      if (badge) {
        badge.textContent = role;
        badge.className = 'badge ' + (admin ? 'badge-gold' : 'badge-navy');
      }

      setShown('acctReviewItem', admin);
      if (admin) refreshPendingCount();
    }
  }

  function switchAuthTab(which) {
    document.querySelectorAll('.auth-tab').forEach(function (t) {
      t.classList.toggle('active', t.dataset.authtab === which);
    });
    document.querySelectorAll('.auth-pane').forEach(function (p) {
      p.style.display = (p.dataset.pane === which) ? '' : 'none';
    });
    var e1 = document.getElementById('authError'); if (e1) e1.textContent = '';
    var e2 = document.getElementById('registerMsg'); if (e2) e2.textContent = '';
  }

  function openLogin(which) {
    var m = document.getElementById('authModal');
    if (!m) return;
    m.classList.add('open');
    document.body.style.overflow = 'hidden';
    var e = document.getElementById('authError'); if (e) e.textContent = '';
    switchAuthTab(which === 'register' ? 'register' : 'login');
    var focus = document.getElementById(which === 'register' ? 'rg_name' : 'li_email');
    if (focus) setTimeout(function () { focus.focus(); }, 60);
  }
  function closeLogin() {
    var m = document.getElementById('authModal');
    if (m) m.classList.remove('open');
    document.body.style.overflow = '';
  }

  function doLogin(email, password) {
    var err = document.getElementById('authError');
    if (!sb) { err.textContent = 'Login is unavailable (Supabase not loaded).'; return; }
    err.textContent = 'Signing in…';
    sb.auth.signInWithPassword({ email: email, password: password }).then(function (res) {
      if (res.error) { err.textContent = res.error.message; return; }
      currentUser = res.data.user;
      closeLogin();
      updateAuthUI();
      refreshEvents();
      openDashboard();
    });
  }

  function doRegister(name, org, email, password) {
    var msg = document.getElementById('registerMsg');
    if (!sb) { msg.textContent = 'Sign-up is unavailable (Supabase not loaded).'; return; }
    msg.className = 'form-note';
    msg.textContent = 'Creating your account…';
    sb.auth.signUp({
      email: email,
      password: password,
      options: { data: { full_name: name, organisation: org } }
    }).then(function (res) {
      if (res.error) { msg.className = 'form-note err'; msg.textContent = res.error.message; return; }
      // If email confirmation is OFF, a session is returned and we can log straight in.
      if (res.data && res.data.session) {
        currentUser = res.data.user;
        closeLogin();
        updateAuthUI();
        refreshEvents();
        openDashboard();
      } else {
        // Email confirmation is ON — they must confirm before signing in.
        msg.className = 'form-note ok';
        msg.textContent = 'Account created. Check your email to confirm, then sign in.';
        switchAuthTab('login');
        var le = document.getElementById('li_email'); if (le) le.value = email;
      }
    });
  }

  function doLogout() {
    if (!sb) return;
    sb.auth.signOut().then(function () {
      currentUser = null;
      closeAcctMenu();
      updateAuthUI();
      closeDashboard();
      refreshEvents();
    });
  }

  // =====================================================================
  //  DASHBOARD  (submit + manage events)
  // =====================================================================
  function blankForm() {
    return {
      id: null, type: 'Guest Lecture', title: '', description: '',
      speaker: '', speaker_info: '', event_date: '', event_time: '',
      location: '', is_sponsored: false, sponsor_info: '',
      link: '', link_text: 'Register'
    };
  }

  var dashStatusFilter = 'all';

  function switchDashTab(which) {
    document.querySelectorAll('.dash-tab').forEach(function (t) {
      t.classList.toggle('active', t.dataset.dashtab === which);
    });
    document.querySelectorAll('.dash-pane').forEach(function (p) {
      p.style.display = (p.dataset.dashpane === which) ? '' : 'none';
    });
  }

  function setDashFilter(which) {
    dashStatusFilter = which;
    document.querySelectorAll('#dashFilter .chip').forEach(function (c) {
      c.classList.toggle('active', c.dataset.dashfilter === which);
    });
    renderDashList();
  }

  // tab: 'form' | 'list'. filter: optional status to preselect on the list.
  function openDashboard(tab, filter) {
    var d = document.getElementById('dashModal');
    if (!d) return;
    d.classList.add('open');
    document.body.style.overflow = 'hidden';

    var sub = document.getElementById('dashSub');
    if (sub) {
      sub.textContent = isAdmin()
        ? 'Publish a session, and review or edit anything contributors have submitted.'
        : 'Submit a session for the lab to review, or manage what you\'ve already sent in.';
    }

    fillForm(blankForm());
    switchDashTab(tab === 'list' ? 'list' : 'form');
    setDashFilter(filter || 'all');
    loadDashList();
  }

  function closeDashboard() {
    var d = document.getElementById('dashModal');
    if (d) d.classList.remove('open');
    document.body.style.overflow = '';
  }

  function fillForm(ev) {
    document.getElementById('f_id').value = ev.id || '';
    document.getElementById('f_type').value = ev.type || 'Guest Lecture';
    document.getElementById('f_title').value = ev.title || '';
    document.getElementById('f_desc').value = ev.description || '';
    document.getElementById('f_speaker').value = ev.speaker || '';
    document.getElementById('f_speaker_info').value = ev.speaker_info || '';
    document.getElementById('f_date').value = ev.event_date || '';
    document.getElementById('f_time').value = ev.event_time || '';
    document.getElementById('f_location').value = ev.location || '';
    document.getElementById('f_sponsored').checked = !!ev.is_sponsored;
    document.getElementById('f_sponsor_info').value = ev.sponsor_info || '';
    document.getElementById('f_link').value = ev.link || '';
    document.getElementById('f_linktext').value = ev.link_text || '';
    document.getElementById('f_formTitle').textContent = ev.id ? 'Edit event' : 'Submit a new event';
    document.getElementById('f_submitBtn').innerHTML = ev.id
      ? '<i class="fas fa-floppy-disk"></i> Save changes'
      : '<i class="fas fa-paper-plane"></i> Submit event';
    toggleSponsorField();
    var fmsg = document.getElementById('f_msg');
    fmsg.className = 'form-note';
    fmsg.textContent = '';
  }

  function toggleSponsorField() {
    var on = document.getElementById('f_sponsored').checked;
    document.getElementById('sponsorWrap').style.display = on ? '' : 'none';
  }

  function saveEvent() {
    var msg = document.getElementById('f_msg');
    if (!sb || !currentUser) { msg.textContent = 'Please log in first.'; return; }
    var id = document.getElementById('f_id').value || null;
    var payload = {
      type: document.getElementById('f_type').value,
      title: document.getElementById('f_title').value.trim(),
      description: document.getElementById('f_desc').value.trim(),
      speaker: document.getElementById('f_speaker').value.trim(),
      speaker_info: document.getElementById('f_speaker_info').value.trim(),
      event_date: document.getElementById('f_date').value,
      event_time: document.getElementById('f_time').value.trim(),
      location: document.getElementById('f_location').value.trim(),
      is_sponsored: document.getElementById('f_sponsored').checked,
      sponsor_info: document.getElementById('f_sponsor_info').value.trim(),
      link: document.getElementById('f_link').value.trim(),
      link_text: document.getElementById('f_linktext').value.trim()
    };
    if (!payload.title || !payload.event_date) {
      msg.className = 'form-note err';
      msg.textContent = 'Add a title and a date before submitting.';
      return;
    }
    msg.className = 'form-note';
    msg.textContent = 'Saving…';

    var op;
    if (id) {
      // editing existing — keep its status unless admin changes it elsewhere
      op = sb.from('events').update(payload).eq('id', id);
    } else {
      payload.submitted_by = userEmail();
      // admin's own submissions auto-approve; everyone else is pending
      payload.status = isAdmin() ? 'approved' : 'pending';
      op = sb.from('events').insert(payload);
    }
    op.then(function (res) {
      if (res.error) { msg.className = 'form-note err'; msg.textContent = res.error.message; return; }
      msg.className = 'form-note ok';
      msg.textContent = id ? 'Changes saved.'
        : (isAdmin() ? 'Published.' : 'Submitted. The lab will review it before it appears publicly.');
      fillForm(blankForm());
      loadDashList();
      refreshEvents();
    });
  }

  var _dashRows = [];

  function loadDashList() {
    var box = document.getElementById('dashList');
    if (!box) return;
    if (!sb) { box.innerHTML = '<p class="dash-empty">Event storage is unavailable right now.</p>'; return; }
    box.innerHTML = '<p class="dash-empty">Loading your events…</p>';
    sb.from('events').select('*').order('created_at', { ascending: false }).then(function (res) {
      if (res.error) {
        box.innerHTML = '<p class="dash-empty">Couldn\'t load events. Refresh the page to try again.</p>';
        return;
      }
      _dashRows = res.data || [];
      renderDashList();
      refreshPendingCount();
    });
  }

  function renderDashList() {
    var box = document.getElementById('dashList');
    if (!box) return;

    var rows = _dashRows.filter(function (r) {
      return dashStatusFilter === 'all' || r.status === dashStatusFilter;
    });

    if (!rows.length) {
      box.innerHTML = '<p class="dash-empty">' + (
        _dashRows.length
          ? 'Nothing with that status.'
          : 'No events yet. Use the submit tab to add your first one.'
      ) + '</p>';
      return;
    }

    box.innerHTML = rows.map(function (r) {
        var mine = (r.submitted_by || '').toLowerCase() === userEmail().toLowerCase();
        var canEdit = isAdmin() || mine;
        var adminBtns = isAdmin() ? (
          (r.status !== 'approved' ? '<button class="mini ok" data-act="approve" data-id="' + r.id + '">Approve</button>' : '') +
          (r.status !== 'rejected' ? '<button class="mini warn" data-act="reject" data-id="' + r.id + '">Reject</button>' : '')
        ) : '';
        var editBtns = canEdit ? (
          '<button class="mini" data-act="edit" data-id="' + r.id + '">Edit</button>' +
          '<button class="mini danger" data-act="delete" data-id="' + r.id + '">Delete</button>'
        ) : '';
        return '<div class="dash-row">' +
          '<div class="dash-main">' +
          '<span class="dash-status ' + esc(r.status) + '">' + esc(r.status) + '</span>' +
          '<strong>' + esc(r.title) + '</strong>' +
          '<span class="dash-sub">' + esc(r.type) + ' · ' + esc(fmtDate(r.event_date)) +
          (r.submitted_by ? ' · by ' + esc(r.submitted_by) : '') + '</span>' +
          '</div>' +
          '<div class="dash-actions">' + adminBtns + editBtns + '</div>' +
          '</div>';
      }).join('');

    box.querySelectorAll('button[data-act]').forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.dataset.id, act = b.dataset.act;
        if (act === 'edit') {
          var row = _dashRows.find(function (x) { return x.id === id; });
          if (row) {
            fillForm(row);
            switchDashTab('form');
            // the body is the scroll container now, not the backdrop
            var body = document.querySelector('#dashModal .modal-body');
            if (body) body.scrollTop = 0;
            document.getElementById('dashModal').scrollTop = 0;
          }
        } else if (act === 'delete') {
          if (!confirm('Delete this event permanently? This can\'t be undone.')) return;
          sb.from('events').delete().eq('id', id).then(function (r2) {
            if (r2.error) alert(r2.error.message); else { loadDashList(); refreshEvents(); }
          });
        } else if (act === 'approve' || act === 'reject') {
          sb.from('events').update({ status: act === 'approve' ? 'approved' : 'rejected' }).eq('id', id)
            .then(function (r2) { if (r2.error) alert(r2.error.message); else { loadDashList(); refreshEvents(); } });
        }
      });
    });
  }

  // =====================================================================
  //  BOOT
  // =====================================================================
  function wire() {
    wireTabs();

    // signed-out button
    var authBtn = document.getElementById('authBtn');
    if (authBtn) authBtn.addEventListener('click', function () {
      if (currentUser) doLogout(); else openLogin();
    });

    // ---- contributor menu -------------------------------------------
    var trigger = document.getElementById('acctTrigger');
    if (trigger) trigger.addEventListener('click', function (e) {
      e.stopPropagation();
      toggleAcctMenu();
    });

    document.querySelectorAll('[data-acct]').forEach(function (item) {
      item.addEventListener('click', function () {
        var act = item.dataset.acct;
        closeAcctMenu();
        if (act === 'submit') openDashboard('form');
        else if (act === 'manage') openDashboard('list');
        else if (act === 'review') openDashboard('list', 'pending');
        else if (act === 'signout') doLogout();
      });
    });

    // close on outside click, and on Escape
    document.addEventListener('click', function (e) {
      var wrap = document.getElementById('acct');
      if (wrap && !wrap.contains(e.target)) closeAcctMenu();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      var menu = document.getElementById('acctMenu');
      if (menu && !menu.hidden) {
        closeAcctMenu();
        if (trigger) trigger.focus();
      }
    });

    // mobile equivalents
    var dashM = document.getElementById('acctDashMobile');
    if (dashM) dashM.addEventListener('click', function (e) {
      e.preventDefault();
      if (window.closeMobileMenu) window.closeMobileMenu();
      openDashboard('list');
    });
    var outM = document.getElementById('acctSignoutMobile');
    if (outM) outM.addEventListener('click', function (e) {
      e.preventDefault();
      if (window.closeMobileMenu) window.closeMobileMenu();
      doLogout();
    });

    // ---- dashboard tabs and status filter ---------------------------
    document.querySelectorAll('.dash-tab').forEach(function (t) {
      t.addEventListener('click', function () { switchDashTab(t.dataset.dashtab); });
    });
    document.querySelectorAll('#dashFilter .chip').forEach(function (c) {
      c.addEventListener('click', function () { setDashFilter(c.dataset.dashfilter); });
    });

    var lf = document.getElementById('loginForm');
    if (lf) lf.addEventListener('submit', function (e) {
      e.preventDefault();
      doLogin(document.getElementById('li_email').value.trim(), document.getElementById('li_pass').value);
    });

    var rf = document.getElementById('registerForm');
    if (rf) rf.addEventListener('submit', function (e) {
      e.preventDefault();
      doRegister(
        document.getElementById('rg_name').value.trim(),
        document.getElementById('rg_org').value.trim(),
        document.getElementById('rg_email').value.trim(),
        document.getElementById('rg_pass').value
      );
    });

    document.querySelectorAll('.auth-tab').forEach(function (t) {
      t.addEventListener('click', function () { switchAuthTab(t.dataset.authtab); });
    });

    document.querySelectorAll('[data-close-auth]').forEach(function (el) { el.addEventListener('click', closeLogin); });
    document.querySelectorAll('[data-close-dash]').forEach(function (el) { el.addEventListener('click', closeDashboard); });

    // clicking the backdrop closes the dialog
    var authModal = document.getElementById('authModal');
    if (authModal) authModal.addEventListener('click', function (e) {
      if (e.target === authModal) closeLogin();
    });
    var dashModal = document.getElementById('dashModal');
    if (dashModal) dashModal.addEventListener('click', function (e) {
      if (e.target === dashModal) closeDashboard();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (authModal && authModal.classList.contains('open')) closeLogin();
      else if (dashModal && dashModal.classList.contains('open')) closeDashboard();
    });

    var sp = document.getElementById('f_sponsored');
    if (sp) sp.addEventListener('change', toggleSponsorField);

    var sb2 = document.getElementById('f_submitBtn');
    if (sb2) sb2.addEventListener('click', function (e) { e.preventDefault(); saveEvent(); });

    var nb = document.getElementById('f_newBtn');
    if (nb) nb.addEventListener('click', function (e) { e.preventDefault(); fillForm(blankForm()); });

    // ---- deep-link support ------------------------------------------
    // Share these links to send people straight to the right place:
    //   index.html#submit-event   -> opens the submit/login flow
    //   index.html#register       -> opens the create-account form
    function handleDeepLink() {
      var h = (location.hash || '').replace('#', '').toLowerCase();
      if (h === 'register') { openLogin('register'); }
      else if (h === 'submit-event' || h === 'host-event' || h === 'submit') {
        if (currentUser) openDashboard(); else openLogin('login');
      }
    }

    // restore an existing session on page load
    if (sb) {
      sb.auth.getSession().then(function (res) {
        currentUser = (res.data && res.data.session) ? res.data.session.user : null;
        updateAuthUI();
        renderEvents('upcoming');
        handleDeepLink();
      });
      sb.auth.onAuthStateChange(function (_e, session) {
        currentUser = session ? session.user : null;
        updateAuthUI();
      });
    } else {
      renderEvents('upcoming');
      handleDeepLink();
    }
    window.addEventListener('hashchange', handleDeepLink);
    updateAuthUI();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wire);
  } else {
    wire();
  }
})();
