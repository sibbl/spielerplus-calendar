/**
 * Mock HTML data for tests.
 * All team names, member names, and addresses are fictional/obfuscated.
 */

export const MOCK_LOGIN_PAGE = `
<!DOCTYPE html>
<html>
<head>
  <meta name="csrf-token" content="mock-csrf-token-abc123">
  <title>Einloggen</title>
</head>
<body>
  <form id="login-form" action="/site/login" method="post">
    <input type="hidden" name="_csrf" value="mock-csrf-token-abc123">
    <input type="email" name="LoginForm[email]" />
    <input type="password" name="LoginForm[password]" />
    <button type="submit">Einloggen</button>
  </form>
</body>
</html>
`;

export const MOCK_DASHBOARD_HTML = `
<!DOCTYPE html>
<html>
<head><title>Startseite</title></head>
<body>
  <div class="dashboard">Welcome</div>
</body>
</html>
`;

export const MOCK_EVENTS_HTML = `
<!DOCTYPE html>
<html>
<head><title>Termine</title></head>
<body>
<div id="events">
  <div class="list event">
    <div class="panel" id="event-training-10001">
      <div class="panel-heading light panel-heading--lightgreen">
        <a class="event-header-border" href="/training/view?id=10001"></a>
        <div class="panel-heading-info">
          <div class="panel-title">Di.</div>
          <div class="panel-subtitle">15.04</div>
        </div>
        <div class="panel-heading-text">
          <div class="panel-title">Training</div>
        </div>
      </div>
      <div class="panel-content">
        <div class="event-time">
          <div class="event-time-item">
            <div class="event-time-label">Treffen</div>
            <div class="event-time-value">19:00</div>
          </div>
          <div class="event-time-item">
            <div class="event-time-label">Beginn</div>
            <div class="event-time-value">19:15</div>
          </div>
          <div class="event-time-item">
            <div class="event-time-label">Ende</div>
            <div class="event-time-value">20:45</div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="list event">
    <div class="panel" id="event-game-20001">
      <div class="panel-heading light panel-heading--blue">
        <a class="event-header-border" href="/game/view?id=20001"></a>
        <div class="panel-heading-info">
          <div class="panel-title">Do.</div>
          <div class="panel-subtitle">17.04</div>
        </div>
        <div class="panel-heading-text">
          <div class="panel-title">Testspiel bei Phantomkicker (Auswärtsspiel)</div>
          <div class="panel-subtitle">Phantomkicker</div>
        </div>
      </div>
      <div class="panel-content">
        <div class="event-time">
          <div class="event-time-item">
            <div class="event-time-label">Treffen</div>
            <div class="event-time-value">18:30</div>
          </div>
          <div class="event-time-item">
            <div class="event-time-label">Beginn</div>
            <div class="event-time-value">19:00</div>
          </div>
          <div class="event-time-item">
            <div class="event-time-label">Ende</div>
            <div class="event-time-value">21:00</div>
          </div>
        </div>
        <div class="list-item small event-info">freundschaftlich</div>
      </div>
    </div>
  </div>

  <div class="list event">
    <div class="panel" id="event-game-20002">
      <div class="panel-heading light panel-heading--blue">
        <a class="event-header-border" href="/game/view?id=20002"></a>
        <div class="panel-heading-info">
          <div class="panel-title">Sa.</div>
          <div class="panel-subtitle">19.04</div>
        </div>
        <div class="panel-heading-text">
          <div class="panel-title">Galaxie.Volley</div>
          <div class="panel-subtitle">3. Spieltag - Heimspiel</div>
        </div>
      </div>
      <div class="panel-content">
        <div class="event-time">
          <div class="event-time-item">
            <div class="event-time-label">Treffen</div>
            <div class="event-time-value">14:00</div>
          </div>
          <div class="event-time-item">
            <div class="event-time-label">Beginn</div>
            <div class="event-time-value">14:30</div>
          </div>
          <div class="event-time-item">
            <div class="event-time-label">Ende</div>
            <div class="event-time-value">17:00</div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="list event">
    <div class="panel" id="event-training-10002">
      <div class="panel-heading light panel-heading--lightgreen">
        <a class="event-header-border" href="/training/view?id=10002"></a>
        <div class="panel-heading-info">
          <div class="panel-title">Di.</div>
          <div class="panel-subtitle">22.04</div>
        </div>
        <div class="panel-heading-text">
          <div class="panel-title">Training</div>
        </div>
      </div>
      <div class="panel-content">
        <div class="event-time">
          <div class="event-time-item">
            <div class="event-time-label">Treffen</div>
            <div class="event-time-value">19:00</div>
          </div>
          <div class="event-time-item">
            <div class="event-time-label">Beginn</div>
            <div class="event-time-value">19:15</div>
          </div>
          <div class="event-time-item">
            <div class="event-time-label">Ende</div>
            <div class="event-time-value">20:45</div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="list event">
    <div class="panel" id="event-other-30001">
      <div class="panel-heading light panel-heading--yellow">
        <a class="event-header-border" href="/event/view?id=30001"></a>
        <div class="panel-heading-info">
          <div class="panel-title">So.</div>
          <div class="panel-subtitle">27.04</div>
        </div>
        <div class="panel-heading-text">
          <div class="panel-title">Teamfeier</div>
        </div>
      </div>
      <div class="panel-content">
        <div class="event-time">
          <div class="event-time-item">
            <div class="event-time-label">Treffen</div>
            <div class="event-time-value">16:00</div>
          </div>
          <div class="event-time-item">
            <div class="event-time-label">Beginn</div>
            <div class="event-time-value">16:00</div>
          </div>
          <div class="event-time-item">
            <div class="event-time-label">Ende</div>
            <div class="event-time-value">22:00</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
<div class="load-events more">
  <button id="load-more-events-btn" type="button" offset="5">Mehr Termine laden</button>
</div>
</body>
</html>
`;

export const MOCK_LOAD_MORE_RESPONSE = {
  html: `
  <div class="list event">
    <div class="panel" id="event-training-10003">
      <div class="panel-heading light panel-heading--lightgreen">
        <a class="event-header-border" href="/training/view?id=10003"></a>
        <div class="panel-heading-info">
          <div class="panel-title">Do.</div>
          <div class="panel-subtitle">01.05</div>
        </div>
        <div class="panel-heading-text">
          <div class="panel-title">Training</div>
        </div>
      </div>
      <div class="panel-content">
        <div class="event-time">
          <div class="event-time-item">
            <div class="event-time-label">Treffen</div>
            <div class="event-time-value">19:00</div>
          </div>
          <div class="event-time-item">
            <div class="event-time-label">Beginn</div>
            <div class="event-time-value">19:15</div>
          </div>
          <div class="event-time-item">
            <div class="event-time-label">Ende</div>
            <div class="event-time-value">20:45</div>
          </div>
        </div>
      </div>
    </div>
  </div>
  `,
  count: 1,
};

export const MOCK_TRAINING_DETAIL_HTML = `
<!DOCTYPE html>
<html>
<head><title>Di, 15.04.2026</title></head>
<body>
  <div>Training</div>
  <a href="javascript:void(0);">
    <div>
      <h4>Adresse</h4>
      <div>Musterweg 42, 04000 Beispielstadt, Deutschland</div>
    </div>
  </a>
</body>
</html>
`;

export const MOCK_GAME_DETAIL_HTML = `
<!DOCTYPE html>
<html>
<head><title>Do, 17.04.2026</title></head>
<body>
  <div>Testspiel bei Phantomkicker - Auswärtsspiel</div>
  <a href="javascript:void(0);">
    <div>
      <h4>Adresse</h4>
      <div>Fiktivstraße 7, 04100 Beispielstadt, Deutschland</div>
    </div>
  </a>
</body>
</html>
`;

export const MOCK_GAME2_DETAIL_HTML = `
<!DOCTYPE html>
<html>
<head><title>Sa, 19.04.2026</title></head>
<body>
  <div>Galaxie.Volley - 3. Spieltag - Heimspiel</div>
  <a href="javascript:void(0);">
    <div>
      <h4>Adresse</h4>
      <div>Hauptplatz 1, 04000 Beispielstadt, Deutschland
Sporthalle Nord</div>
    </div>
  </a>
</body>
</html>
`;

export const MOCK_TRAINING2_DETAIL_HTML = MOCK_TRAINING_DETAIL_HTML;

export const MOCK_OTHER_DETAIL_HTML = `
<!DOCTYPE html>
<html>
<head><title>So, 27.04.2026</title></head>
<body>
  <div>Teamfeier</div>
</body>
</html>
`;
