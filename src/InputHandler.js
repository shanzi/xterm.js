
class InputHandler {
  constructor(term) {
    this.term = term;
    this.textarea = term.textarea;

    this.lastEvent = null;
    this.lastKey = null;

    this.isComposing = false;

    this.bindKeys();
    this.term.on('refresh', this.updateCompositionElements.bind(this));

    this.flushLastEvent = this.flushLastEvent.bind(this);
  }
  
  bindKeys() {
    this.textarea.addEventListener('blur', this.blur.bind(this), true);
    this.textarea.addEventListener('keydown', this.dispatchKeyEvent.bind(this), true);
    this.textarea.addEventListener('keypress', this.dispatchKeyEvent.bind(this), true);
    this.textarea.addEventListener('compositionstart', this.compositionStart.bind(this), true);
    this.textarea.addEventListener('compositionend', this.compositionEnd.bind(this), true);
  }

  blur(e) {
    if (this.isComposing) {
      this.isComposing = false;
      this.compositionEnd();
    }
  }

  dispatchKeyEvent(ev) {
    console.log(ev);
    if (this.isComposing) return;

    this.flushLastEvent(this.lastEvent, this.lastKey);
    const res  = (ev.type === "keydown") ? this.keyDown(ev) : this.keyPress(ev);

    return res;
  }

  keyDown(ev) {
    const term = this.term;
    const result = term.evaluateKeyEscapeSequence(ev);

    if (result.scrollDisp) {
      term.scrollDisp(result.scrollDisp);
      return term.cancel(ev, true);
    }

    if (isThirdLevelShift(term, ev)) {
      return true;
    }

    if (result.cancel) {
      // The event is canceled at the end already, is this necessary?
      term.cancel(ev, true);
    }

    if (!result.key) {
      return true;
    }

    term.showCursor();
    this.putLastEvent(ev, result.key);

    return term.cancel(ev, true);
  }

  keyPress(ev) {
    let key;
    const term = this.term;

    term.cancel(ev);

    if (ev.charCode) {
      key = ev.charCode;
    } else if (ev.which == null) {
      key = ev.keyCode;
    } else if (ev.which !== 0 && ev.charCode !== 0) {
      key = ev.which;
    } else {
      return false;
    }

    if (!key || (
      (ev.altKey || ev.ctrlKey || ev.metaKey) && !isThirdLevelShift(term, ev)
    )) {
      return false;
    }

    key = String.fromCharCode(key);

    term.showCursor();
    this.putLastEvent(ev, key);

    return false;
  }

  putLastEvent(ev, key) {
    this.lastEvent = ev;
    this.lastKey = key;
    setTimeout(this.flushLastEvent, 50, ev, key);
  }

  flushLastEvent(ev, key) {
    if (this.lastEvent === null) return;
    if (this.lastEvent === ev && this.lastKey === key) {
      this.term.handler(key);
      this.lastEvent = null;
      this.lastKey = null;
      this.textarea.value = '';
    }
  }
  
  compositionStart(ev) {
    console.log(ev);
    this.lastEvent = null;
    this.lastKey = null;
    this.isComposing = true;
    this.updateCompositionElements();
  }

  compositionEnd(ev) {
    console.log(ev);
    this.isComposing = false;
    const event = ev || 'compositionend';
    const key = (ev === undefined ? this.textarea.value : ev.data);
    this.putLastEvent(event, key);

    this.clearCompositionElements();
  }

  updateCompositionElements() {
    if (!this.isComposing) return;

    const {term, textarea} = this;
    const cursor = term.element.querySelector('.terminal-cursor');

    if (cursor) {
      cursor.style.opacity = 0;

      const xtermRows = term.element.querySelector('.xterm-rows');
      const cursorTop = xtermRows.offsetTop + cursor.offsetTop;

      textarea.style.top = cursorTop + 'px';
      textarea.style.left = cursor.offsetLeft + 'px';
      textarea.style.width = xtermRows.offsetWidth - cursor.offsetLeft + 'px';
      textarea.style.height = cursor.offsetHeight + 'px';
      textarea.style.lineHeight = cursor.offsetHeight + 'px';

      textarea.style.opacity = 1;
    }
  }

  clearCompositionElements() {
    const {term, textarea} = this;
    const cursor = term.element.querySelector('.terminal-cursor');
    if (cursor) {
      cursor.style.opacity = '';

      textarea.style.top= '';
      textarea.style.left = '';
      textarea.style.width = '';
      textarea.style.height = '';
      textarea.style.lineHeight = '';
      textarea.style.opacity = '';
    }
  }
}

function isThirdLevelShift(term, ev) {
  var thirdLevelKey =
    (term.browser.isMac && ev.altKey && !ev.ctrlKey && !ev.metaKey) ||
    (term.browser.isMSWindows && ev.altKey && ev.ctrlKey && !ev.metaKey);

  if (ev.type == 'keypress') {
    return thirdLevelKey;
  }

  // Don't invoke for arrows, pageDown, home, backspace, etc. (on non-keypress events)
  return thirdLevelKey && (!ev.keyCode || ev.keyCode > 47);
}

export { InputHandler }
