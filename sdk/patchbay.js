/*! Patchbay SDK v0.1 · MIT · https://github.com/VVVRGIT/patchbay
 *
 * Macht ein Web-Tool zu einem Patchbay-Node. Minimalbeispiel:
 *
 *   <script src="https://patchbay-pi.vercel.app/sdk/patchbay.js"></script>
 *   <script>
 *     Patchbay.tool({
 *       manifest: { id: 'com.example.invert', name: 'Invert', version: '1.0.0',
 *                   accepts: ['image/*'], produces: ['image/png'], params: [] },
 *       render: function (input, params) {          // ImageData | null, Werte laut Schema
 *         var out = new ImageData(input.width, input.height), s = input.data, d = out.data;
 *         for (var i = 0; i < s.length; i += 4) { d[i] = 255 - s[i]; d[i+1] = 255 - s[i+1]; d[i+2] = 255 - s[i+2]; d[i+3] = s[i+3]; }
 *         return out;                                 // ImageData oder Promise<ImageData>
 *       },
 *       ui: function (pb) { ... }                     // optional: eigene Oberfläche (Modus „Original“)
 *     });
 *   </script>
 *
 * Modi
 *   headless    Host schickt render(input, params) und erwartet ein Ergebnis. Keine Oberfläche.
 *   embedded    Tool zeigt seine eigene Oberfläche im Node. Reglerwerte gehen per pb.setParams()
 *               an den Host, das berechnete Ergebnis kommt per pb.onState() zurück.
 *   standalone  Seite wurde direkt geöffnet. ui() läuft, render() rechnet lokal auf def.sample().
 */
(function (global) {
  'use strict';
  var V = '0.1';

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function toImageData(o) { return o ? new ImageData(new Uint8ClampedArray(o.buf), o.w, o.h) : null; }

  function tool(def) {
    if (!def || !def.manifest || typeof def.render !== 'function') throw new Error('Patchbay.tool: manifest und render() sind Pflicht');
    var M = def.manifest, port = null, mode = null, stateFns = [], uiStarted = false, sample;
    var params = {};
    (M.params || []).forEach(function (p) { params[p.id] = p.default; });

    var api = {
      version: V,
      manifest: M,
      params: params,
      get mode() { return mode; },
      /** Reglerwerte ändern. Im Host löst das eine Neuberechnung aus, standalone wird lokal gerechnet. */
      setParams: function (values) {
        Object.assign(params, values || {});
        if (mode === 'embedded' && port) port.postMessage({ pb: 'params', v: V, values: clone(params) });
        else if (mode === 'standalone') localRun();
      },
      /** Callback bekommt { params, input, output } (ImageData oder null). */
      onState: function (fn) { stateFns.push(fn); },
      imageData: toImageData
    };

    function emit(state) { stateFns.forEach(function (fn) { try { fn(state); } catch (e) { console.error(e); } }); }
    function reportSize() {
      if (!port) return;
      port.postMessage({ pb: 'size', v: V, h: Math.ceil(document.documentElement.scrollHeight) });
    }
    function startUI() {
      if (uiStarted || typeof def.ui !== 'function') return;
      uiStarted = true;
      def.ui(api);
      if (typeof ResizeObserver !== 'undefined') new ResizeObserver(reportSize).observe(document.documentElement);
      reportSize();
    }
    async function onMsg(d) {
      if (!d || !d.pb) return;
      if (d.pb === 'render') {
        var t0 = performance.now();
        try {
          var out = await def.render(toImageData(d.input), d.params || params);
          var b = out.data.buffer;
          port.postMessage({ pb: 'result', v: V, rid: d.rid, output: { buf: b, w: out.width, h: out.height }, ms: performance.now() - t0 }, [b]);
        } catch (err) {
          port.postMessage({ pb: 'error', v: V, rid: d.rid, message: String((err && err.message) || err) });
        }
      } else if (d.pb === 'state') {
        if (d.params) Object.assign(params, d.params);
        emit({ params: params, input: toImageData(d.input), output: toImageData(d.output) });
      } else if (d.pb === 'theme' && typeof def.theme === 'function') {
        def.theme(d.theme);
      }
    }
    async function localRun() {
      if (sample === undefined) sample = typeof def.sample === 'function' ? await def.sample() : null;
      var out = await def.render(sample, params);
      emit({ params: params, input: sample, output: out });
    }

    global.addEventListener('message', function (e) {
      if (e.source !== global.parent || port) return;
      var d = e.data;
      if (!d || d.pb !== 'init' || !e.ports || !e.ports[0]) return;
      port = e.ports[0]; mode = d.mode;
      if (d.params) Object.assign(params, d.params);
      port.onmessage = function (ev) { onMsg(ev.data); };
      if (d.theme && typeof def.theme === 'function') def.theme(d.theme);
      if (mode === 'embedded' || mode === 'interactive') startUI();
    });

    if (global.parent && global.parent !== global) {
      global.parent.postMessage({ pb: 'hello', v: V, tool: { id: M.id, version: M.version }, accepts: M.accepts || [], produces: M.produces || [] }, '*');
    } else {
      mode = 'standalone';
      startUI();
      localRun();
    }
    return api;
  }

  global.Patchbay = { version: V, tool: tool };
})(window);
