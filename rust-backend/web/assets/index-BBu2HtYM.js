var jb = Object.defineProperty;
var Nb = (l, r, u) =>
  r in l
    ? jb(l, r, { enumerable: !0, configurable: !0, writable: !0, value: u })
    : (l[r] = u);
var en = (l, r, u) => Nb(l, typeof r != 'symbol' ? r + '' : r, u);
function Rb(l, r) {
  for (var u = 0; u < r.length; u++) {
    const c = r[u];
    if (typeof c != 'string' && !Array.isArray(c)) {
      for (const f in c)
        if (f !== 'default' && !(f in l)) {
          const d = Object.getOwnPropertyDescriptor(c, f);
          d &&
            Object.defineProperty(
              l,
              f,
              d.get ? d : { enumerable: !0, get: () => c[f] },
            );
        }
    }
  }
  return Object.freeze(
    Object.defineProperty(l, Symbol.toStringTag, { value: 'Module' }),
  );
}
(function () {
  const r = document.createElement('link').relList;
  if (r && r.supports && r.supports('modulepreload')) return;
  for (const f of document.querySelectorAll('link[rel="modulepreload"]')) c(f);
  new MutationObserver((f) => {
    for (const d of f)
      if (d.type === 'childList')
        for (const m of d.addedNodes)
          m.tagName === 'LINK' && m.rel === 'modulepreload' && c(m);
  }).observe(document, { childList: !0, subtree: !0 });
  function u(f) {
    const d = {};
    return (
      f.integrity && (d.integrity = f.integrity),
      f.referrerPolicy && (d.referrerPolicy = f.referrerPolicy),
      f.crossOrigin === 'use-credentials'
        ? (d.credentials = 'include')
        : f.crossOrigin === 'anonymous'
          ? (d.credentials = 'omit')
          : (d.credentials = 'same-origin'),
      d
    );
  }
  function c(f) {
    if (f.ep) return;
    f.ep = !0;
    const d = u(f);
    fetch(f.href, d);
  }
})();
function $m(l) {
  return l && l.__esModule && Object.prototype.hasOwnProperty.call(l, 'default')
    ? l.default
    : l;
}
var xc = { exports: {} },
  hi = {};
/**
 * @license React
 * react-jsx-runtime.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */ var im;
function zb() {
  if (im) return hi;
  im = 1;
  var l = Symbol.for('react.transitional.element'),
    r = Symbol.for('react.fragment');
  function u(c, f, d) {
    var m = null;
    if (
      (d !== void 0 && (m = '' + d),
      f.key !== void 0 && (m = '' + f.key),
      'key' in f)
    ) {
      d = {};
      for (var x in f) x !== 'key' && (d[x] = f[x]);
    } else d = f;
    return (
      (f = d.ref),
      { $$typeof: l, type: c, key: m, ref: f !== void 0 ? f : null, props: d }
    );
  }
  return ((hi.Fragment = r), (hi.jsx = u), (hi.jsxs = u), hi);
}
var sm;
function _b() {
  return (sm || ((sm = 1), (xc.exports = zb())), xc.exports);
}
var h = _b(),
  Sc = { exports: {} },
  ge = {};
/**
 * @license React
 * react.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */ var rm;
function Ob() {
  if (rm) return ge;
  rm = 1;
  var l = Symbol.for('react.transitional.element'),
    r = Symbol.for('react.portal'),
    u = Symbol.for('react.fragment'),
    c = Symbol.for('react.strict_mode'),
    f = Symbol.for('react.profiler'),
    d = Symbol.for('react.consumer'),
    m = Symbol.for('react.context'),
    x = Symbol.for('react.forward_ref'),
    p = Symbol.for('react.suspense'),
    v = Symbol.for('react.memo'),
    S = Symbol.for('react.lazy'),
    b = Symbol.for('react.activity'),
    _ = Symbol.iterator;
  function V(w) {
    return w === null || typeof w != 'object'
      ? null
      : ((w = (_ && w[_]) || w['@@iterator']),
        typeof w == 'function' ? w : null);
  }
  var G = {
      isMounted: function () {
        return !1;
      },
      enqueueForceUpdate: function () {},
      enqueueReplaceState: function () {},
      enqueueSetState: function () {},
    },
    B = Object.assign,
    D = {};
  function k(w, g, A) {
    ((this.props = w),
      (this.context = g),
      (this.refs = D),
      (this.updater = A || G));
  }
  ((k.prototype.isReactComponent = {}),
    (k.prototype.setState = function (w, g) {
      if (typeof w != 'object' && typeof w != 'function' && w != null)
        throw Error(
          'takes an object of state variables to update or a function which returns an object of state variables.',
        );
      this.updater.enqueueSetState(this, w, g, 'setState');
    }),
    (k.prototype.forceUpdate = function (w) {
      this.updater.enqueueForceUpdate(this, w, 'forceUpdate');
    }));
  function te() {}
  te.prototype = k.prototype;
  function F(w, g, A) {
    ((this.props = w),
      (this.context = g),
      (this.refs = D),
      (this.updater = A || G));
  }
  var I = (F.prototype = new te());
  ((I.constructor = F), B(I, k.prototype), (I.isPureReactComponent = !0));
  var ne = Array.isArray;
  function W() {}
  var J = { H: null, A: null, T: null, S: null },
    Z = Object.prototype.hasOwnProperty;
  function ye(w, g, A) {
    var N = A.ref;
    return {
      $$typeof: l,
      type: w,
      key: g,
      ref: N !== void 0 ? N : null,
      props: A,
    };
  }
  function Ye(w, g) {
    return ye(w.type, g, w.props);
  }
  function Re(w) {
    return typeof w == 'object' && w !== null && w.$$typeof === l;
  }
  function Ee(w) {
    var g = { '=': '=0', ':': '=2' };
    return (
      '$' +
      w.replace(/[=:]/g, function (A) {
        return g[A];
      })
    );
  }
  var De = /\/+/g;
  function Be(w, g) {
    return typeof w == 'object' && w !== null && w.key != null
      ? Ee('' + w.key)
      : g.toString(36);
  }
  function ae(w) {
    switch (w.status) {
      case 'fulfilled':
        return w.value;
      case 'rejected':
        throw w.reason;
      default:
        switch (
          (typeof w.status == 'string'
            ? w.then(W, W)
            : ((w.status = 'pending'),
              w.then(
                function (g) {
                  w.status === 'pending' &&
                    ((w.status = 'fulfilled'), (w.value = g));
                },
                function (g) {
                  w.status === 'pending' &&
                    ((w.status = 'rejected'), (w.reason = g));
                },
              )),
          w.status)
        ) {
          case 'fulfilled':
            return w.value;
          case 'rejected':
            throw w.reason;
        }
    }
    throw w;
  }
  function z(w, g, A, N, Q) {
    var K = typeof w;
    (K === 'undefined' || K === 'boolean') && (w = null);
    var P = !1;
    if (w === null) P = !0;
    else
      switch (K) {
        case 'bigint':
        case 'string':
        case 'number':
          P = !0;
          break;
        case 'object':
          switch (w.$$typeof) {
            case l:
            case r:
              P = !0;
              break;
            case S:
              return ((P = w._init), z(P(w._payload), g, A, N, Q));
          }
      }
    if (P)
      return (
        (Q = Q(w)),
        (P = N === '' ? '.' + Be(w, 0) : N),
        ne(Q)
          ? ((A = ''),
            P != null && (A = P.replace(De, '$&/') + '/'),
            z(Q, g, A, '', function (ee) {
              return ee;
            }))
          : Q != null &&
            (Re(Q) &&
              (Q = Ye(
                Q,
                A +
                  (Q.key == null || (w && w.key === Q.key)
                    ? ''
                    : ('' + Q.key).replace(De, '$&/') + '/') +
                  P,
              )),
            g.push(Q)),
        1
      );
    P = 0;
    var fe = N === '' ? '.' : N + ':';
    if (ne(w))
      for (var Y = 0; Y < w.length; Y++)
        ((N = w[Y]), (K = fe + Be(N, Y)), (P += z(N, g, A, K, Q)));
    else if (((Y = V(w)), typeof Y == 'function'))
      for (w = Y.call(w), Y = 0; !(N = w.next()).done; )
        ((N = N.value), (K = fe + Be(N, Y++)), (P += z(N, g, A, K, Q)));
    else if (K === 'object') {
      if (typeof w.then == 'function') return z(ae(w), g, A, N, Q);
      throw (
        (g = String(w)),
        Error(
          'Objects are not valid as a React child (found: ' +
            (g === '[object Object]'
              ? 'object with keys {' + Object.keys(w).join(', ') + '}'
              : g) +
            '). If you meant to render a collection of children, use an array instead.',
        )
      );
    }
    return P;
  }
  function q(w, g, A) {
    if (w == null) return w;
    var N = [],
      Q = 0;
    return (
      z(w, N, '', '', function (K) {
        return g.call(A, K, Q++);
      }),
      N
    );
  }
  function le(w) {
    if (w._status === -1) {
      var g = w._result;
      ((g = g()),
        g.then(
          function (A) {
            (w._status === 0 || w._status === -1) &&
              ((w._status = 1), (w._result = A));
          },
          function (A) {
            (w._status === 0 || w._status === -1) &&
              ((w._status = 2), (w._result = A));
          },
        ),
        w._status === -1 && ((w._status = 0), (w._result = g)));
    }
    if (w._status === 1) return w._result.default;
    throw w._result;
  }
  var ce =
      typeof reportError == 'function'
        ? reportError
        : function (w) {
            if (
              typeof window == 'object' &&
              typeof window.ErrorEvent == 'function'
            ) {
              var g = new window.ErrorEvent('error', {
                bubbles: !0,
                cancelable: !0,
                message:
                  typeof w == 'object' &&
                  w !== null &&
                  typeof w.message == 'string'
                    ? String(w.message)
                    : String(w),
                error: w,
              });
              if (!window.dispatchEvent(g)) return;
            } else if (
              typeof process == 'object' &&
              typeof process.emit == 'function'
            ) {
              process.emit('uncaughtException', w);
              return;
            }
            console.error(w);
          },
    $ = {
      map: q,
      forEach: function (w, g, A) {
        q(
          w,
          function () {
            g.apply(this, arguments);
          },
          A,
        );
      },
      count: function (w) {
        var g = 0;
        return (
          q(w, function () {
            g++;
          }),
          g
        );
      },
      toArray: function (w) {
        return (
          q(w, function (g) {
            return g;
          }) || []
        );
      },
      only: function (w) {
        if (!Re(w))
          throw Error(
            'React.Children.only expected to receive a single React element child.',
          );
        return w;
      },
    };
  return (
    (ge.Activity = b),
    (ge.Children = $),
    (ge.Component = k),
    (ge.Fragment = u),
    (ge.Profiler = f),
    (ge.PureComponent = F),
    (ge.StrictMode = c),
    (ge.Suspense = p),
    (ge.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = J),
    (ge.__COMPILER_RUNTIME = {
      __proto__: null,
      c: function (w) {
        return J.H.useMemoCache(w);
      },
    }),
    (ge.cache = function (w) {
      return function () {
        return w.apply(null, arguments);
      };
    }),
    (ge.cacheSignal = function () {
      return null;
    }),
    (ge.cloneElement = function (w, g, A) {
      if (w == null)
        throw Error(
          'The argument must be a React element, but you passed ' + w + '.',
        );
      var N = B({}, w.props),
        Q = w.key;
      if (g != null)
        for (K in (g.key !== void 0 && (Q = '' + g.key), g))
          !Z.call(g, K) ||
            K === 'key' ||
            K === '__self' ||
            K === '__source' ||
            (K === 'ref' && g.ref === void 0) ||
            (N[K] = g[K]);
      var K = arguments.length - 2;
      if (K === 1) N.children = A;
      else if (1 < K) {
        for (var P = Array(K), fe = 0; fe < K; fe++) P[fe] = arguments[fe + 2];
        N.children = P;
      }
      return ye(w.type, Q, N);
    }),
    (ge.createContext = function (w) {
      return (
        (w = {
          $$typeof: m,
          _currentValue: w,
          _currentValue2: w,
          _threadCount: 0,
          Provider: null,
          Consumer: null,
        }),
        (w.Provider = w),
        (w.Consumer = { $$typeof: d, _context: w }),
        w
      );
    }),
    (ge.createElement = function (w, g, A) {
      var N,
        Q = {},
        K = null;
      if (g != null)
        for (N in (g.key !== void 0 && (K = '' + g.key), g))
          Z.call(g, N) &&
            N !== 'key' &&
            N !== '__self' &&
            N !== '__source' &&
            (Q[N] = g[N]);
      var P = arguments.length - 2;
      if (P === 1) Q.children = A;
      else if (1 < P) {
        for (var fe = Array(P), Y = 0; Y < P; Y++) fe[Y] = arguments[Y + 2];
        Q.children = fe;
      }
      if (w && w.defaultProps)
        for (N in ((P = w.defaultProps), P)) Q[N] === void 0 && (Q[N] = P[N]);
      return ye(w, K, Q);
    }),
    (ge.createRef = function () {
      return { current: null };
    }),
    (ge.forwardRef = function (w) {
      return { $$typeof: x, render: w };
    }),
    (ge.isValidElement = Re),
    (ge.lazy = function (w) {
      return { $$typeof: S, _payload: { _status: -1, _result: w }, _init: le };
    }),
    (ge.memo = function (w, g) {
      return { $$typeof: v, type: w, compare: g === void 0 ? null : g };
    }),
    (ge.startTransition = function (w) {
      var g = J.T,
        A = {};
      J.T = A;
      try {
        var N = w(),
          Q = J.S;
        (Q !== null && Q(A, N),
          typeof N == 'object' &&
            N !== null &&
            typeof N.then == 'function' &&
            N.then(W, ce));
      } catch (K) {
        ce(K);
      } finally {
        (g !== null && A.types !== null && (g.types = A.types), (J.T = g));
      }
    }),
    (ge.unstable_useCacheRefresh = function () {
      return J.H.useCacheRefresh();
    }),
    (ge.use = function (w) {
      return J.H.use(w);
    }),
    (ge.useActionState = function (w, g, A) {
      return J.H.useActionState(w, g, A);
    }),
    (ge.useCallback = function (w, g) {
      return J.H.useCallback(w, g);
    }),
    (ge.useContext = function (w) {
      return J.H.useContext(w);
    }),
    (ge.useDebugValue = function () {}),
    (ge.useDeferredValue = function (w, g) {
      return J.H.useDeferredValue(w, g);
    }),
    (ge.useEffect = function (w, g) {
      return J.H.useEffect(w, g);
    }),
    (ge.useEffectEvent = function (w) {
      return J.H.useEffectEvent(w);
    }),
    (ge.useId = function () {
      return J.H.useId();
    }),
    (ge.useImperativeHandle = function (w, g, A) {
      return J.H.useImperativeHandle(w, g, A);
    }),
    (ge.useInsertionEffect = function (w, g) {
      return J.H.useInsertionEffect(w, g);
    }),
    (ge.useLayoutEffect = function (w, g) {
      return J.H.useLayoutEffect(w, g);
    }),
    (ge.useMemo = function (w, g) {
      return J.H.useMemo(w, g);
    }),
    (ge.useOptimistic = function (w, g) {
      return J.H.useOptimistic(w, g);
    }),
    (ge.useReducer = function (w, g, A) {
      return J.H.useReducer(w, g, A);
    }),
    (ge.useRef = function (w) {
      return J.H.useRef(w);
    }),
    (ge.useState = function (w) {
      return J.H.useState(w);
    }),
    (ge.useSyncExternalStore = function (w, g, A) {
      return J.H.useSyncExternalStore(w, g, A);
    }),
    (ge.useTransition = function () {
      return J.H.useTransition();
    }),
    (ge.version = '19.2.5'),
    ge
  );
}
var um;
function Xc() {
  return (um || ((um = 1), (Sc.exports = Ob())), Sc.exports);
}
var E = Xc();
const Wm = $m(E),
  Cb = Rb({ __proto__: null, default: Wm }, [E]);
var Ec = { exports: {} },
  mi = {},
  Tc = { exports: {} },
  Ac = {};
/**
 * @license React
 * scheduler.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */ var cm;
function Mb() {
  return (
    cm ||
      ((cm = 1),
      (function (l) {
        function r(z, q) {
          var le = z.length;
          z.push(q);
          e: for (; 0 < le; ) {
            var ce = (le - 1) >>> 1,
              $ = z[ce];
            if (0 < f($, q)) ((z[ce] = q), (z[le] = $), (le = ce));
            else break e;
          }
        }
        function u(z) {
          return z.length === 0 ? null : z[0];
        }
        function c(z) {
          if (z.length === 0) return null;
          var q = z[0],
            le = z.pop();
          if (le !== q) {
            z[0] = le;
            e: for (var ce = 0, $ = z.length, w = $ >>> 1; ce < w; ) {
              var g = 2 * (ce + 1) - 1,
                A = z[g],
                N = g + 1,
                Q = z[N];
              if (0 > f(A, le))
                N < $ && 0 > f(Q, A)
                  ? ((z[ce] = Q), (z[N] = le), (ce = N))
                  : ((z[ce] = A), (z[g] = le), (ce = g));
              else if (N < $ && 0 > f(Q, le))
                ((z[ce] = Q), (z[N] = le), (ce = N));
              else break e;
            }
          }
          return q;
        }
        function f(z, q) {
          var le = z.sortIndex - q.sortIndex;
          return le !== 0 ? le : z.id - q.id;
        }
        if (
          ((l.unstable_now = void 0),
          typeof performance == 'object' &&
            typeof performance.now == 'function')
        ) {
          var d = performance;
          l.unstable_now = function () {
            return d.now();
          };
        } else {
          var m = Date,
            x = m.now();
          l.unstable_now = function () {
            return m.now() - x;
          };
        }
        var p = [],
          v = [],
          S = 1,
          b = null,
          _ = 3,
          V = !1,
          G = !1,
          B = !1,
          D = !1,
          k = typeof setTimeout == 'function' ? setTimeout : null,
          te = typeof clearTimeout == 'function' ? clearTimeout : null,
          F = typeof setImmediate < 'u' ? setImmediate : null;
        function I(z) {
          for (var q = u(v); q !== null; ) {
            if (q.callback === null) c(v);
            else if (q.startTime <= z)
              (c(v), (q.sortIndex = q.expirationTime), r(p, q));
            else break;
            q = u(v);
          }
        }
        function ne(z) {
          if (((B = !1), I(z), !G))
            if (u(p) !== null) ((G = !0), W || ((W = !0), Ee()));
            else {
              var q = u(v);
              q !== null && ae(ne, q.startTime - z);
            }
        }
        var W = !1,
          J = -1,
          Z = 5,
          ye = -1;
        function Ye() {
          return D ? !0 : !(l.unstable_now() - ye < Z);
        }
        function Re() {
          if (((D = !1), W)) {
            var z = l.unstable_now();
            ye = z;
            var q = !0;
            try {
              e: {
                ((G = !1), B && ((B = !1), te(J), (J = -1)), (V = !0));
                var le = _;
                try {
                  t: {
                    for (
                      I(z), b = u(p);
                      b !== null && !(b.expirationTime > z && Ye());
                    ) {
                      var ce = b.callback;
                      if (typeof ce == 'function') {
                        ((b.callback = null), (_ = b.priorityLevel));
                        var $ = ce(b.expirationTime <= z);
                        if (((z = l.unstable_now()), typeof $ == 'function')) {
                          ((b.callback = $), I(z), (q = !0));
                          break t;
                        }
                        (b === u(p) && c(p), I(z));
                      } else c(p);
                      b = u(p);
                    }
                    if (b !== null) q = !0;
                    else {
                      var w = u(v);
                      (w !== null && ae(ne, w.startTime - z), (q = !1));
                    }
                  }
                  break e;
                } finally {
                  ((b = null), (_ = le), (V = !1));
                }
                q = void 0;
              }
            } finally {
              q ? Ee() : (W = !1);
            }
          }
        }
        var Ee;
        if (typeof F == 'function')
          Ee = function () {
            F(Re);
          };
        else if (typeof MessageChannel < 'u') {
          var De = new MessageChannel(),
            Be = De.port2;
          ((De.port1.onmessage = Re),
            (Ee = function () {
              Be.postMessage(null);
            }));
        } else
          Ee = function () {
            k(Re, 0);
          };
        function ae(z, q) {
          J = k(function () {
            z(l.unstable_now());
          }, q);
        }
        ((l.unstable_IdlePriority = 5),
          (l.unstable_ImmediatePriority = 1),
          (l.unstable_LowPriority = 4),
          (l.unstable_NormalPriority = 3),
          (l.unstable_Profiling = null),
          (l.unstable_UserBlockingPriority = 2),
          (l.unstable_cancelCallback = function (z) {
            z.callback = null;
          }),
          (l.unstable_forceFrameRate = function (z) {
            0 > z || 125 < z
              ? console.error(
                  'forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported',
                )
              : (Z = 0 < z ? Math.floor(1e3 / z) : 5);
          }),
          (l.unstable_getCurrentPriorityLevel = function () {
            return _;
          }),
          (l.unstable_next = function (z) {
            switch (_) {
              case 1:
              case 2:
              case 3:
                var q = 3;
                break;
              default:
                q = _;
            }
            var le = _;
            _ = q;
            try {
              return z();
            } finally {
              _ = le;
            }
          }),
          (l.unstable_requestPaint = function () {
            D = !0;
          }),
          (l.unstable_runWithPriority = function (z, q) {
            switch (z) {
              case 1:
              case 2:
              case 3:
              case 4:
              case 5:
                break;
              default:
                z = 3;
            }
            var le = _;
            _ = z;
            try {
              return q();
            } finally {
              _ = le;
            }
          }),
          (l.unstable_scheduleCallback = function (z, q, le) {
            var ce = l.unstable_now();
            switch (
              (typeof le == 'object' && le !== null
                ? ((le = le.delay),
                  (le = typeof le == 'number' && 0 < le ? ce + le : ce))
                : (le = ce),
              z)
            ) {
              case 1:
                var $ = -1;
                break;
              case 2:
                $ = 250;
                break;
              case 5:
                $ = 1073741823;
                break;
              case 4:
                $ = 1e4;
                break;
              default:
                $ = 5e3;
            }
            return (
              ($ = le + $),
              (z = {
                id: S++,
                callback: q,
                priorityLevel: z,
                startTime: le,
                expirationTime: $,
                sortIndex: -1,
              }),
              le > ce
                ? ((z.sortIndex = le),
                  r(v, z),
                  u(p) === null &&
                    z === u(v) &&
                    (B ? (te(J), (J = -1)) : (B = !0), ae(ne, le - ce)))
                : ((z.sortIndex = $),
                  r(p, z),
                  G || V || ((G = !0), W || ((W = !0), Ee()))),
              z
            );
          }),
          (l.unstable_shouldYield = Ye),
          (l.unstable_wrapCallback = function (z) {
            var q = _;
            return function () {
              var le = _;
              _ = q;
              try {
                return z.apply(this, arguments);
              } finally {
                _ = le;
              }
            };
          }));
      })(Ac)),
    Ac
  );
}
var om;
function Db() {
  return (om || ((om = 1), (Tc.exports = Mb())), Tc.exports);
}
var wc = { exports: {} },
  yt = {};
/**
 * @license React
 * react-dom.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */ var fm;
function Ub() {
  if (fm) return yt;
  fm = 1;
  var l = Xc();
  function r(p) {
    var v = 'https://react.dev/errors/' + p;
    if (1 < arguments.length) {
      v += '?args[]=' + encodeURIComponent(arguments[1]);
      for (var S = 2; S < arguments.length; S++)
        v += '&args[]=' + encodeURIComponent(arguments[S]);
    }
    return (
      'Minified React error #' +
      p +
      '; visit ' +
      v +
      ' for the full message or use the non-minified dev environment for full errors and additional helpful warnings.'
    );
  }
  function u() {}
  var c = {
      d: {
        f: u,
        r: function () {
          throw Error(r(522));
        },
        D: u,
        C: u,
        L: u,
        m: u,
        X: u,
        S: u,
        M: u,
      },
      p: 0,
      findDOMNode: null,
    },
    f = Symbol.for('react.portal');
  function d(p, v, S) {
    var b =
      3 < arguments.length && arguments[3] !== void 0 ? arguments[3] : null;
    return {
      $$typeof: f,
      key: b == null ? null : '' + b,
      children: p,
      containerInfo: v,
      implementation: S,
    };
  }
  var m = l.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  function x(p, v) {
    if (p === 'font') return '';
    if (typeof v == 'string') return v === 'use-credentials' ? v : '';
  }
  return (
    (yt.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = c),
    (yt.createPortal = function (p, v) {
      var S =
        2 < arguments.length && arguments[2] !== void 0 ? arguments[2] : null;
      if (!v || (v.nodeType !== 1 && v.nodeType !== 9 && v.nodeType !== 11))
        throw Error(r(299));
      return d(p, v, null, S);
    }),
    (yt.flushSync = function (p) {
      var v = m.T,
        S = c.p;
      try {
        if (((m.T = null), (c.p = 2), p)) return p();
      } finally {
        ((m.T = v), (c.p = S), c.d.f());
      }
    }),
    (yt.preconnect = function (p, v) {
      typeof p == 'string' &&
        (v
          ? ((v = v.crossOrigin),
            (v =
              typeof v == 'string'
                ? v === 'use-credentials'
                  ? v
                  : ''
                : void 0))
          : (v = null),
        c.d.C(p, v));
    }),
    (yt.prefetchDNS = function (p) {
      typeof p == 'string' && c.d.D(p);
    }),
    (yt.preinit = function (p, v) {
      if (typeof p == 'string' && v && typeof v.as == 'string') {
        var S = v.as,
          b = x(S, v.crossOrigin),
          _ = typeof v.integrity == 'string' ? v.integrity : void 0,
          V = typeof v.fetchPriority == 'string' ? v.fetchPriority : void 0;
        S === 'style'
          ? c.d.S(p, typeof v.precedence == 'string' ? v.precedence : void 0, {
              crossOrigin: b,
              integrity: _,
              fetchPriority: V,
            })
          : S === 'script' &&
            c.d.X(p, {
              crossOrigin: b,
              integrity: _,
              fetchPriority: V,
              nonce: typeof v.nonce == 'string' ? v.nonce : void 0,
            });
      }
    }),
    (yt.preinitModule = function (p, v) {
      if (typeof p == 'string')
        if (typeof v == 'object' && v !== null) {
          if (v.as == null || v.as === 'script') {
            var S = x(v.as, v.crossOrigin);
            c.d.M(p, {
              crossOrigin: S,
              integrity: typeof v.integrity == 'string' ? v.integrity : void 0,
              nonce: typeof v.nonce == 'string' ? v.nonce : void 0,
            });
          }
        } else v == null && c.d.M(p);
    }),
    (yt.preload = function (p, v) {
      if (
        typeof p == 'string' &&
        typeof v == 'object' &&
        v !== null &&
        typeof v.as == 'string'
      ) {
        var S = v.as,
          b = x(S, v.crossOrigin);
        c.d.L(p, S, {
          crossOrigin: b,
          integrity: typeof v.integrity == 'string' ? v.integrity : void 0,
          nonce: typeof v.nonce == 'string' ? v.nonce : void 0,
          type: typeof v.type == 'string' ? v.type : void 0,
          fetchPriority:
            typeof v.fetchPriority == 'string' ? v.fetchPriority : void 0,
          referrerPolicy:
            typeof v.referrerPolicy == 'string' ? v.referrerPolicy : void 0,
          imageSrcSet:
            typeof v.imageSrcSet == 'string' ? v.imageSrcSet : void 0,
          imageSizes: typeof v.imageSizes == 'string' ? v.imageSizes : void 0,
          media: typeof v.media == 'string' ? v.media : void 0,
        });
      }
    }),
    (yt.preloadModule = function (p, v) {
      if (typeof p == 'string')
        if (v) {
          var S = x(v.as, v.crossOrigin);
          c.d.m(p, {
            as: typeof v.as == 'string' && v.as !== 'script' ? v.as : void 0,
            crossOrigin: S,
            integrity: typeof v.integrity == 'string' ? v.integrity : void 0,
          });
        } else c.d.m(p);
    }),
    (yt.requestFormReset = function (p) {
      c.d.r(p);
    }),
    (yt.unstable_batchedUpdates = function (p, v) {
      return p(v);
    }),
    (yt.useFormState = function (p, v, S) {
      return m.H.useFormState(p, v, S);
    }),
    (yt.useFormStatus = function () {
      return m.H.useHostTransitionStatus();
    }),
    (yt.version = '19.2.5'),
    yt
  );
}
var dm;
function Fm() {
  if (dm) return wc.exports;
  dm = 1;
  function l() {
    if (
      !(
        typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > 'u' ||
        typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE != 'function'
      )
    )
      try {
        __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(l);
      } catch (r) {
        console.error(r);
      }
  }
  return (l(), (wc.exports = Ub()), wc.exports);
}
/**
 * @license React
 * react-dom-client.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */ var hm;
function kb() {
  if (hm) return mi;
  hm = 1;
  var l = Db(),
    r = Xc(),
    u = Fm();
  function c(e) {
    var t = 'https://react.dev/errors/' + e;
    if (1 < arguments.length) {
      t += '?args[]=' + encodeURIComponent(arguments[1]);
      for (var a = 2; a < arguments.length; a++)
        t += '&args[]=' + encodeURIComponent(arguments[a]);
    }
    return (
      'Minified React error #' +
      e +
      '; visit ' +
      t +
      ' for the full message or use the non-minified dev environment for full errors and additional helpful warnings.'
    );
  }
  function f(e) {
    return !(!e || (e.nodeType !== 1 && e.nodeType !== 9 && e.nodeType !== 11));
  }
  function d(e) {
    var t = e,
      a = e;
    if (e.alternate) for (; t.return; ) t = t.return;
    else {
      e = t;
      do ((t = e), (t.flags & 4098) !== 0 && (a = t.return), (e = t.return));
      while (e);
    }
    return t.tag === 3 ? a : null;
  }
  function m(e) {
    if (e.tag === 13) {
      var t = e.memoizedState;
      if (
        (t === null && ((e = e.alternate), e !== null && (t = e.memoizedState)),
        t !== null)
      )
        return t.dehydrated;
    }
    return null;
  }
  function x(e) {
    if (e.tag === 31) {
      var t = e.memoizedState;
      if (
        (t === null && ((e = e.alternate), e !== null && (t = e.memoizedState)),
        t !== null)
      )
        return t.dehydrated;
    }
    return null;
  }
  function p(e) {
    if (d(e) !== e) throw Error(c(188));
  }
  function v(e) {
    var t = e.alternate;
    if (!t) {
      if (((t = d(e)), t === null)) throw Error(c(188));
      return t !== e ? null : e;
    }
    for (var a = e, n = t; ; ) {
      var i = a.return;
      if (i === null) break;
      var s = i.alternate;
      if (s === null) {
        if (((n = i.return), n !== null)) {
          a = n;
          continue;
        }
        break;
      }
      if (i.child === s.child) {
        for (s = i.child; s; ) {
          if (s === a) return (p(i), e);
          if (s === n) return (p(i), t);
          s = s.sibling;
        }
        throw Error(c(188));
      }
      if (a.return !== n.return) ((a = i), (n = s));
      else {
        for (var o = !1, y = i.child; y; ) {
          if (y === a) {
            ((o = !0), (a = i), (n = s));
            break;
          }
          if (y === n) {
            ((o = !0), (n = i), (a = s));
            break;
          }
          y = y.sibling;
        }
        if (!o) {
          for (y = s.child; y; ) {
            if (y === a) {
              ((o = !0), (a = s), (n = i));
              break;
            }
            if (y === n) {
              ((o = !0), (n = s), (a = i));
              break;
            }
            y = y.sibling;
          }
          if (!o) throw Error(c(189));
        }
      }
      if (a.alternate !== n) throw Error(c(190));
    }
    if (a.tag !== 3) throw Error(c(188));
    return a.stateNode.current === a ? e : t;
  }
  function S(e) {
    var t = e.tag;
    if (t === 5 || t === 26 || t === 27 || t === 6) return e;
    for (e = e.child; e !== null; ) {
      if (((t = S(e)), t !== null)) return t;
      e = e.sibling;
    }
    return null;
  }
  var b = Object.assign,
    _ = Symbol.for('react.element'),
    V = Symbol.for('react.transitional.element'),
    G = Symbol.for('react.portal'),
    B = Symbol.for('react.fragment'),
    D = Symbol.for('react.strict_mode'),
    k = Symbol.for('react.profiler'),
    te = Symbol.for('react.consumer'),
    F = Symbol.for('react.context'),
    I = Symbol.for('react.forward_ref'),
    ne = Symbol.for('react.suspense'),
    W = Symbol.for('react.suspense_list'),
    J = Symbol.for('react.memo'),
    Z = Symbol.for('react.lazy'),
    ye = Symbol.for('react.activity'),
    Ye = Symbol.for('react.memo_cache_sentinel'),
    Re = Symbol.iterator;
  function Ee(e) {
    return e === null || typeof e != 'object'
      ? null
      : ((e = (Re && e[Re]) || e['@@iterator']),
        typeof e == 'function' ? e : null);
  }
  var De = Symbol.for('react.client.reference');
  function Be(e) {
    if (e == null) return null;
    if (typeof e == 'function')
      return e.$$typeof === De ? null : e.displayName || e.name || null;
    if (typeof e == 'string') return e;
    switch (e) {
      case B:
        return 'Fragment';
      case k:
        return 'Profiler';
      case D:
        return 'StrictMode';
      case ne:
        return 'Suspense';
      case W:
        return 'SuspenseList';
      case ye:
        return 'Activity';
    }
    if (typeof e == 'object')
      switch (e.$$typeof) {
        case G:
          return 'Portal';
        case F:
          return e.displayName || 'Context';
        case te:
          return (e._context.displayName || 'Context') + '.Consumer';
        case I:
          var t = e.render;
          return (
            (e = e.displayName),
            e ||
              ((e = t.displayName || t.name || ''),
              (e = e !== '' ? 'ForwardRef(' + e + ')' : 'ForwardRef')),
            e
          );
        case J:
          return (
            (t = e.displayName || null),
            t !== null ? t : Be(e.type) || 'Memo'
          );
        case Z:
          ((t = e._payload), (e = e._init));
          try {
            return Be(e(t));
          } catch {}
      }
    return null;
  }
  var ae = Array.isArray,
    z = r.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,
    q = u.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,
    le = { pending: !1, data: null, method: null, action: null },
    ce = [],
    $ = -1;
  function w(e) {
    return { current: e };
  }
  function g(e) {
    0 > $ || ((e.current = ce[$]), (ce[$] = null), $--);
  }
  function A(e, t) {
    ($++, (ce[$] = e.current), (e.current = t));
  }
  var N = w(null),
    Q = w(null),
    K = w(null),
    P = w(null);
  function fe(e, t) {
    switch ((A(K, t), A(Q, e), A(N, null), t.nodeType)) {
      case 9:
      case 11:
        e = (e = t.documentElement) && (e = e.namespaceURI) ? Rh(e) : 0;
        break;
      default:
        if (((e = t.tagName), (t = t.namespaceURI)))
          ((t = Rh(t)), (e = zh(t, e)));
        else
          switch (e) {
            case 'svg':
              e = 1;
              break;
            case 'math':
              e = 2;
              break;
            default:
              e = 0;
          }
    }
    (g(N), A(N, e));
  }
  function Y() {
    (g(N), g(Q), g(K));
  }
  function ee(e) {
    e.memoizedState !== null && A(P, e);
    var t = N.current,
      a = zh(t, e.type);
    t !== a && (A(Q, e), A(N, a));
  }
  function xe(e) {
    (Q.current === e && (g(N), g(Q)),
      P.current === e && (g(P), (ci._currentValue = le)));
  }
  var Ke, pe;
  function he(e) {
    if (Ke === void 0)
      try {
        throw Error();
      } catch (a) {
        var t = a.stack.trim().match(/\n( *(at )?)/);
        ((Ke = (t && t[1]) || ''),
          (pe =
            -1 <
            a.stack.indexOf(`
    at`)
              ? ' (<anonymous>)'
              : -1 < a.stack.indexOf('@')
                ? '@unknown:0:0'
                : ''));
      }
    return (
      `
` +
      Ke +
      e +
      pe
    );
  }
  var Le = !1;
  function ia(e, t) {
    if (!e || Le) return '';
    Le = !0;
    var a = Error.prepareStackTrace;
    Error.prepareStackTrace = void 0;
    try {
      var n = {
        DetermineComponentFrameRoot: function () {
          try {
            if (t) {
              var X = function () {
                throw Error();
              };
              if (
                (Object.defineProperty(X.prototype, 'props', {
                  set: function () {
                    throw Error();
                  },
                }),
                typeof Reflect == 'object' && Reflect.construct)
              ) {
                try {
                  Reflect.construct(X, []);
                } catch (U) {
                  var M = U;
                }
                Reflect.construct(e, [], X);
              } else {
                try {
                  X.call();
                } catch (U) {
                  M = U;
                }
                e.call(X.prototype);
              }
            } else {
              try {
                throw Error();
              } catch (U) {
                M = U;
              }
              (X = e()) &&
                typeof X.catch == 'function' &&
                X.catch(function () {});
            }
          } catch (U) {
            if (U && M && typeof U.stack == 'string') return [U.stack, M.stack];
          }
          return [null, null];
        },
      };
      n.DetermineComponentFrameRoot.displayName = 'DetermineComponentFrameRoot';
      var i = Object.getOwnPropertyDescriptor(
        n.DetermineComponentFrameRoot,
        'name',
      );
      i &&
        i.configurable &&
        Object.defineProperty(n.DetermineComponentFrameRoot, 'name', {
          value: 'DetermineComponentFrameRoot',
        });
      var s = n.DetermineComponentFrameRoot(),
        o = s[0],
        y = s[1];
      if (o && y) {
        var T = o.split(`
`),
          C = y.split(`
`);
        for (
          i = n = 0;
          n < T.length && !T[n].includes('DetermineComponentFrameRoot');
        )
          n++;
        for (; i < C.length && !C[i].includes('DetermineComponentFrameRoot'); )
          i++;
        if (n === T.length || i === C.length)
          for (
            n = T.length - 1, i = C.length - 1;
            1 <= n && 0 <= i && T[n] !== C[i];
          )
            i--;
        for (; 1 <= n && 0 <= i; n--, i--)
          if (T[n] !== C[i]) {
            if (n !== 1 || i !== 1)
              do
                if ((n--, i--, 0 > i || T[n] !== C[i])) {
                  var H =
                    `
` + T[n].replace(' at new ', ' at ');
                  return (
                    e.displayName &&
                      H.includes('<anonymous>') &&
                      (H = H.replace('<anonymous>', e.displayName)),
                    H
                  );
                }
              while (1 <= n && 0 <= i);
            break;
          }
      }
    } finally {
      ((Le = !1), (Error.prepareStackTrace = a));
    }
    return (a = e ? e.displayName || e.name : '') ? he(a) : '';
  }
  function sn(e, t) {
    switch (e.tag) {
      case 26:
      case 27:
      case 5:
        return he(e.type);
      case 16:
        return he('Lazy');
      case 13:
        return e.child !== t && t !== null
          ? he('Suspense Fallback')
          : he('Suspense');
      case 19:
        return he('SuspenseList');
      case 0:
      case 15:
        return ia(e.type, !1);
      case 11:
        return ia(e.type.render, !1);
      case 1:
        return ia(e.type, !0);
      case 31:
        return he('Activity');
      default:
        return '';
    }
  }
  function rn(e) {
    try {
      var t = '',
        a = null;
      do ((t += sn(e, a)), (a = e), (e = e.return));
      while (e);
      return t;
    } catch (n) {
      return (
        `
Error generating stack: ` +
        n.message +
        `
` +
        n.stack
      );
    }
  }
  var xl = Object.prototype.hasOwnProperty,
    sr = l.unstable_scheduleCallback,
    rr = l.unstable_cancelCallback,
    lp = l.unstable_shouldYield,
    ip = l.unstable_requestPaint,
    At = l.unstable_now,
    sp = l.unstable_getCurrentPriorityLevel,
    lo = l.unstable_ImmediatePriority,
    io = l.unstable_UserBlockingPriority,
    Ei = l.unstable_NormalPriority,
    rp = l.unstable_LowPriority,
    so = l.unstable_IdlePriority,
    up = l.log,
    cp = l.unstable_setDisableYieldValue,
    Sl = null,
    wt = null;
  function za(e) {
    if (
      (typeof up == 'function' && cp(e),
      wt && typeof wt.setStrictMode == 'function')
    )
      try {
        wt.setStrictMode(Sl, e);
      } catch {}
  }
  var jt = Math.clz32 ? Math.clz32 : dp,
    op = Math.log,
    fp = Math.LN2;
  function dp(e) {
    return ((e >>>= 0), e === 0 ? 32 : (31 - ((op(e) / fp) | 0)) | 0);
  }
  var Ti = 256,
    Ai = 262144,
    wi = 4194304;
  function un(e) {
    var t = e & 42;
    if (t !== 0) return t;
    switch (e & -e) {
      case 1:
        return 1;
      case 2:
        return 2;
      case 4:
        return 4;
      case 8:
        return 8;
      case 16:
        return 16;
      case 32:
        return 32;
      case 64:
        return 64;
      case 128:
        return 128;
      case 256:
      case 512:
      case 1024:
      case 2048:
      case 4096:
      case 8192:
      case 16384:
      case 32768:
      case 65536:
      case 131072:
        return e & 261888;
      case 262144:
      case 524288:
      case 1048576:
      case 2097152:
        return e & 3932160;
      case 4194304:
      case 8388608:
      case 16777216:
      case 33554432:
        return e & 62914560;
      case 67108864:
        return 67108864;
      case 134217728:
        return 134217728;
      case 268435456:
        return 268435456;
      case 536870912:
        return 536870912;
      case 1073741824:
        return 0;
      default:
        return e;
    }
  }
  function ji(e, t, a) {
    var n = e.pendingLanes;
    if (n === 0) return 0;
    var i = 0,
      s = e.suspendedLanes,
      o = e.pingedLanes;
    e = e.warmLanes;
    var y = n & 134217727;
    return (
      y !== 0
        ? ((n = y & ~s),
          n !== 0
            ? (i = un(n))
            : ((o &= y),
              o !== 0
                ? (i = un(o))
                : a || ((a = y & ~e), a !== 0 && (i = un(a)))))
        : ((y = n & ~s),
          y !== 0
            ? (i = un(y))
            : o !== 0
              ? (i = un(o))
              : a || ((a = n & ~e), a !== 0 && (i = un(a)))),
      i === 0
        ? 0
        : t !== 0 &&
            t !== i &&
            (t & s) === 0 &&
            ((s = i & -i),
            (a = t & -t),
            s >= a || (s === 32 && (a & 4194048) !== 0))
          ? t
          : i
    );
  }
  function El(e, t) {
    return (e.pendingLanes & ~(e.suspendedLanes & ~e.pingedLanes) & t) === 0;
  }
  function hp(e, t) {
    switch (e) {
      case 1:
      case 2:
      case 4:
      case 8:
      case 64:
        return t + 250;
      case 16:
      case 32:
      case 128:
      case 256:
      case 512:
      case 1024:
      case 2048:
      case 4096:
      case 8192:
      case 16384:
      case 32768:
      case 65536:
      case 131072:
      case 262144:
      case 524288:
      case 1048576:
      case 2097152:
        return t + 5e3;
      case 4194304:
      case 8388608:
      case 16777216:
      case 33554432:
        return -1;
      case 67108864:
      case 134217728:
      case 268435456:
      case 536870912:
      case 1073741824:
        return -1;
      default:
        return -1;
    }
  }
  function ro() {
    var e = wi;
    return ((wi <<= 1), (wi & 62914560) === 0 && (wi = 4194304), e);
  }
  function ur(e) {
    for (var t = [], a = 0; 31 > a; a++) t.push(e);
    return t;
  }
  function Tl(e, t) {
    ((e.pendingLanes |= t),
      t !== 268435456 &&
        ((e.suspendedLanes = 0), (e.pingedLanes = 0), (e.warmLanes = 0)));
  }
  function mp(e, t, a, n, i, s) {
    var o = e.pendingLanes;
    ((e.pendingLanes = a),
      (e.suspendedLanes = 0),
      (e.pingedLanes = 0),
      (e.warmLanes = 0),
      (e.expiredLanes &= a),
      (e.entangledLanes &= a),
      (e.errorRecoveryDisabledLanes &= a),
      (e.shellSuspendCounter = 0));
    var y = e.entanglements,
      T = e.expirationTimes,
      C = e.hiddenUpdates;
    for (a = o & ~a; 0 < a; ) {
      var H = 31 - jt(a),
        X = 1 << H;
      ((y[H] = 0), (T[H] = -1));
      var M = C[H];
      if (M !== null)
        for (C[H] = null, H = 0; H < M.length; H++) {
          var U = M[H];
          U !== null && (U.lane &= -536870913);
        }
      a &= ~X;
    }
    (n !== 0 && uo(e, n, 0),
      s !== 0 && i === 0 && e.tag !== 0 && (e.suspendedLanes |= s & ~(o & ~t)));
  }
  function uo(e, t, a) {
    ((e.pendingLanes |= t), (e.suspendedLanes &= ~t));
    var n = 31 - jt(t);
    ((e.entangledLanes |= t),
      (e.entanglements[n] = e.entanglements[n] | 1073741824 | (a & 261930)));
  }
  function co(e, t) {
    var a = (e.entangledLanes |= t);
    for (e = e.entanglements; a; ) {
      var n = 31 - jt(a),
        i = 1 << n;
      ((i & t) | (e[n] & t) && (e[n] |= t), (a &= ~i));
    }
  }
  function oo(e, t) {
    var a = t & -t;
    return (
      (a = (a & 42) !== 0 ? 1 : cr(a)),
      (a & (e.suspendedLanes | t)) !== 0 ? 0 : a
    );
  }
  function cr(e) {
    switch (e) {
      case 2:
        e = 1;
        break;
      case 8:
        e = 4;
        break;
      case 32:
        e = 16;
        break;
      case 256:
      case 512:
      case 1024:
      case 2048:
      case 4096:
      case 8192:
      case 16384:
      case 32768:
      case 65536:
      case 131072:
      case 262144:
      case 524288:
      case 1048576:
      case 2097152:
      case 4194304:
      case 8388608:
      case 16777216:
      case 33554432:
        e = 128;
        break;
      case 268435456:
        e = 134217728;
        break;
      default:
        e = 0;
    }
    return e;
  }
  function or(e) {
    return (
      (e &= -e),
      2 < e ? (8 < e ? ((e & 134217727) !== 0 ? 32 : 268435456) : 8) : 2
    );
  }
  function fo() {
    var e = q.p;
    return e !== 0 ? e : ((e = window.event), e === void 0 ? 32 : Ih(e.type));
  }
  function ho(e, t) {
    var a = q.p;
    try {
      return ((q.p = e), t());
    } finally {
      q.p = a;
    }
  }
  var _a = Math.random().toString(36).slice(2),
    ct = '__reactFiber$' + _a,
    gt = '__reactProps$' + _a,
    Mn = '__reactContainer$' + _a,
    fr = '__reactEvents$' + _a,
    yp = '__reactListeners$' + _a,
    pp = '__reactHandles$' + _a,
    mo = '__reactResources$' + _a,
    Al = '__reactMarker$' + _a;
  function dr(e) {
    (delete e[ct], delete e[gt], delete e[fr], delete e[yp], delete e[pp]);
  }
  function Dn(e) {
    var t = e[ct];
    if (t) return t;
    for (var a = e.parentNode; a; ) {
      if ((t = a[Mn] || a[ct])) {
        if (
          ((a = t.alternate),
          t.child !== null || (a !== null && a.child !== null))
        )
          for (e = kh(e); e !== null; ) {
            if ((a = e[ct])) return a;
            e = kh(e);
          }
        return t;
      }
      ((e = a), (a = e.parentNode));
    }
    return null;
  }
  function Un(e) {
    if ((e = e[ct] || e[Mn])) {
      var t = e.tag;
      if (
        t === 5 ||
        t === 6 ||
        t === 13 ||
        t === 31 ||
        t === 26 ||
        t === 27 ||
        t === 3
      )
        return e;
    }
    return null;
  }
  function wl(e) {
    var t = e.tag;
    if (t === 5 || t === 26 || t === 27 || t === 6) return e.stateNode;
    throw Error(c(33));
  }
  function kn(e) {
    var t = e[mo];
    return (
      t ||
        (t = e[mo] =
          { hoistableStyles: new Map(), hoistableScripts: new Map() }),
      t
    );
  }
  function st(e) {
    e[Al] = !0;
  }
  var yo = new Set(),
    po = {};
  function cn(e, t) {
    (Hn(e, t), Hn(e + 'Capture', t));
  }
  function Hn(e, t) {
    for (po[e] = t, e = 0; e < t.length; e++) yo.add(t[e]);
  }
  var gp = RegExp(
      '^[:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD][:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD\\-.0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040]*$',
    ),
    go = {},
    bo = {};
  function bp(e) {
    return xl.call(bo, e)
      ? !0
      : xl.call(go, e)
        ? !1
        : gp.test(e)
          ? (bo[e] = !0)
          : ((go[e] = !0), !1);
  }
  function Ni(e, t, a) {
    if (bp(t))
      if (a === null) e.removeAttribute(t);
      else {
        switch (typeof a) {
          case 'undefined':
          case 'function':
          case 'symbol':
            e.removeAttribute(t);
            return;
          case 'boolean':
            var n = t.toLowerCase().slice(0, 5);
            if (n !== 'data-' && n !== 'aria-') {
              e.removeAttribute(t);
              return;
            }
        }
        e.setAttribute(t, '' + a);
      }
  }
  function Ri(e, t, a) {
    if (a === null) e.removeAttribute(t);
    else {
      switch (typeof a) {
        case 'undefined':
        case 'function':
        case 'symbol':
        case 'boolean':
          e.removeAttribute(t);
          return;
      }
      e.setAttribute(t, '' + a);
    }
  }
  function sa(e, t, a, n) {
    if (n === null) e.removeAttribute(a);
    else {
      switch (typeof n) {
        case 'undefined':
        case 'function':
        case 'symbol':
        case 'boolean':
          e.removeAttribute(a);
          return;
      }
      e.setAttributeNS(t, a, '' + n);
    }
  }
  function Ut(e) {
    switch (typeof e) {
      case 'bigint':
      case 'boolean':
      case 'number':
      case 'string':
      case 'undefined':
        return e;
      case 'object':
        return e;
      default:
        return '';
    }
  }
  function vo(e) {
    var t = e.type;
    return (
      (e = e.nodeName) &&
      e.toLowerCase() === 'input' &&
      (t === 'checkbox' || t === 'radio')
    );
  }
  function vp(e, t, a) {
    var n = Object.getOwnPropertyDescriptor(e.constructor.prototype, t);
    if (
      !e.hasOwnProperty(t) &&
      typeof n < 'u' &&
      typeof n.get == 'function' &&
      typeof n.set == 'function'
    ) {
      var i = n.get,
        s = n.set;
      return (
        Object.defineProperty(e, t, {
          configurable: !0,
          get: function () {
            return i.call(this);
          },
          set: function (o) {
            ((a = '' + o), s.call(this, o));
          },
        }),
        Object.defineProperty(e, t, { enumerable: n.enumerable }),
        {
          getValue: function () {
            return a;
          },
          setValue: function (o) {
            a = '' + o;
          },
          stopTracking: function () {
            ((e._valueTracker = null), delete e[t]);
          },
        }
      );
    }
  }
  function hr(e) {
    if (!e._valueTracker) {
      var t = vo(e) ? 'checked' : 'value';
      e._valueTracker = vp(e, t, '' + e[t]);
    }
  }
  function xo(e) {
    if (!e) return !1;
    var t = e._valueTracker;
    if (!t) return !0;
    var a = t.getValue(),
      n = '';
    return (
      e && (n = vo(e) ? (e.checked ? 'true' : 'false') : e.value),
      (e = n),
      e !== a ? (t.setValue(e), !0) : !1
    );
  }
  function zi(e) {
    if (
      ((e = e || (typeof document < 'u' ? document : void 0)), typeof e > 'u')
    )
      return null;
    try {
      return e.activeElement || e.body;
    } catch {
      return e.body;
    }
  }
  var xp = /[\n"\\]/g;
  function kt(e) {
    return e.replace(xp, function (t) {
      return '\\' + t.charCodeAt(0).toString(16) + ' ';
    });
  }
  function mr(e, t, a, n, i, s, o, y) {
    ((e.name = ''),
      o != null &&
      typeof o != 'function' &&
      typeof o != 'symbol' &&
      typeof o != 'boolean'
        ? (e.type = o)
        : e.removeAttribute('type'),
      t != null
        ? o === 'number'
          ? ((t === 0 && e.value === '') || e.value != t) &&
            (e.value = '' + Ut(t))
          : e.value !== '' + Ut(t) && (e.value = '' + Ut(t))
        : (o !== 'submit' && o !== 'reset') || e.removeAttribute('value'),
      t != null
        ? yr(e, o, Ut(t))
        : a != null
          ? yr(e, o, Ut(a))
          : n != null && e.removeAttribute('value'),
      i == null && s != null && (e.defaultChecked = !!s),
      i != null &&
        (e.checked = i && typeof i != 'function' && typeof i != 'symbol'),
      y != null &&
      typeof y != 'function' &&
      typeof y != 'symbol' &&
      typeof y != 'boolean'
        ? (e.name = '' + Ut(y))
        : e.removeAttribute('name'));
  }
  function So(e, t, a, n, i, s, o, y) {
    if (
      (s != null &&
        typeof s != 'function' &&
        typeof s != 'symbol' &&
        typeof s != 'boolean' &&
        (e.type = s),
      t != null || a != null)
    ) {
      if (!((s !== 'submit' && s !== 'reset') || t != null)) {
        hr(e);
        return;
      }
      ((a = a != null ? '' + Ut(a) : ''),
        (t = t != null ? '' + Ut(t) : a),
        y || t === e.value || (e.value = t),
        (e.defaultValue = t));
    }
    ((n = n ?? i),
      (n = typeof n != 'function' && typeof n != 'symbol' && !!n),
      (e.checked = y ? e.checked : !!n),
      (e.defaultChecked = !!n),
      o != null &&
        typeof o != 'function' &&
        typeof o != 'symbol' &&
        typeof o != 'boolean' &&
        (e.name = o),
      hr(e));
  }
  function yr(e, t, a) {
    (t === 'number' && zi(e.ownerDocument) === e) ||
      e.defaultValue === '' + a ||
      (e.defaultValue = '' + a);
  }
  function Bn(e, t, a, n) {
    if (((e = e.options), t)) {
      t = {};
      for (var i = 0; i < a.length; i++) t['$' + a[i]] = !0;
      for (a = 0; a < e.length; a++)
        ((i = t.hasOwnProperty('$' + e[a].value)),
          e[a].selected !== i && (e[a].selected = i),
          i && n && (e[a].defaultSelected = !0));
    } else {
      for (a = '' + Ut(a), t = null, i = 0; i < e.length; i++) {
        if (e[i].value === a) {
          ((e[i].selected = !0), n && (e[i].defaultSelected = !0));
          return;
        }
        t !== null || e[i].disabled || (t = e[i]);
      }
      t !== null && (t.selected = !0);
    }
  }
  function Eo(e, t, a) {
    if (
      t != null &&
      ((t = '' + Ut(t)), t !== e.value && (e.value = t), a == null)
    ) {
      e.defaultValue !== t && (e.defaultValue = t);
      return;
    }
    e.defaultValue = a != null ? '' + Ut(a) : '';
  }
  function To(e, t, a, n) {
    if (t == null) {
      if (n != null) {
        if (a != null) throw Error(c(92));
        if (ae(n)) {
          if (1 < n.length) throw Error(c(93));
          n = n[0];
        }
        a = n;
      }
      (a == null && (a = ''), (t = a));
    }
    ((a = Ut(t)),
      (e.defaultValue = a),
      (n = e.textContent),
      n === a && n !== '' && n !== null && (e.value = n),
      hr(e));
  }
  function qn(e, t) {
    if (t) {
      var a = e.firstChild;
      if (a && a === e.lastChild && a.nodeType === 3) {
        a.nodeValue = t;
        return;
      }
    }
    e.textContent = t;
  }
  var Sp = new Set(
    'animationIterationCount aspectRatio borderImageOutset borderImageSlice borderImageWidth boxFlex boxFlexGroup boxOrdinalGroup columnCount columns flex flexGrow flexPositive flexShrink flexNegative flexOrder gridArea gridRow gridRowEnd gridRowSpan gridRowStart gridColumn gridColumnEnd gridColumnSpan gridColumnStart fontWeight lineClamp lineHeight opacity order orphans scale tabSize widows zIndex zoom fillOpacity floodOpacity stopOpacity strokeDasharray strokeDashoffset strokeMiterlimit strokeOpacity strokeWidth MozAnimationIterationCount MozBoxFlex MozBoxFlexGroup MozLineClamp msAnimationIterationCount msFlex msZoom msFlexGrow msFlexNegative msFlexOrder msFlexPositive msFlexShrink msGridColumn msGridColumnSpan msGridRow msGridRowSpan WebkitAnimationIterationCount WebkitBoxFlex WebKitBoxFlexGroup WebkitBoxOrdinalGroup WebkitColumnCount WebkitColumns WebkitFlex WebkitFlexGrow WebkitFlexPositive WebkitFlexShrink WebkitLineClamp'.split(
      ' ',
    ),
  );
  function Ao(e, t, a) {
    var n = t.indexOf('--') === 0;
    a == null || typeof a == 'boolean' || a === ''
      ? n
        ? e.setProperty(t, '')
        : t === 'float'
          ? (e.cssFloat = '')
          : (e[t] = '')
      : n
        ? e.setProperty(t, a)
        : typeof a != 'number' || a === 0 || Sp.has(t)
          ? t === 'float'
            ? (e.cssFloat = a)
            : (e[t] = ('' + a).trim())
          : (e[t] = a + 'px');
  }
  function wo(e, t, a) {
    if (t != null && typeof t != 'object') throw Error(c(62));
    if (((e = e.style), a != null)) {
      for (var n in a)
        !a.hasOwnProperty(n) ||
          (t != null && t.hasOwnProperty(n)) ||
          (n.indexOf('--') === 0
            ? e.setProperty(n, '')
            : n === 'float'
              ? (e.cssFloat = '')
              : (e[n] = ''));
      for (var i in t)
        ((n = t[i]), t.hasOwnProperty(i) && a[i] !== n && Ao(e, i, n));
    } else for (var s in t) t.hasOwnProperty(s) && Ao(e, s, t[s]);
  }
  function pr(e) {
    if (e.indexOf('-') === -1) return !1;
    switch (e) {
      case 'annotation-xml':
      case 'color-profile':
      case 'font-face':
      case 'font-face-src':
      case 'font-face-uri':
      case 'font-face-format':
      case 'font-face-name':
      case 'missing-glyph':
        return !1;
      default:
        return !0;
    }
  }
  var Ep = new Map([
      ['acceptCharset', 'accept-charset'],
      ['htmlFor', 'for'],
      ['httpEquiv', 'http-equiv'],
      ['crossOrigin', 'crossorigin'],
      ['accentHeight', 'accent-height'],
      ['alignmentBaseline', 'alignment-baseline'],
      ['arabicForm', 'arabic-form'],
      ['baselineShift', 'baseline-shift'],
      ['capHeight', 'cap-height'],
      ['clipPath', 'clip-path'],
      ['clipRule', 'clip-rule'],
      ['colorInterpolation', 'color-interpolation'],
      ['colorInterpolationFilters', 'color-interpolation-filters'],
      ['colorProfile', 'color-profile'],
      ['colorRendering', 'color-rendering'],
      ['dominantBaseline', 'dominant-baseline'],
      ['enableBackground', 'enable-background'],
      ['fillOpacity', 'fill-opacity'],
      ['fillRule', 'fill-rule'],
      ['floodColor', 'flood-color'],
      ['floodOpacity', 'flood-opacity'],
      ['fontFamily', 'font-family'],
      ['fontSize', 'font-size'],
      ['fontSizeAdjust', 'font-size-adjust'],
      ['fontStretch', 'font-stretch'],
      ['fontStyle', 'font-style'],
      ['fontVariant', 'font-variant'],
      ['fontWeight', 'font-weight'],
      ['glyphName', 'glyph-name'],
      ['glyphOrientationHorizontal', 'glyph-orientation-horizontal'],
      ['glyphOrientationVertical', 'glyph-orientation-vertical'],
      ['horizAdvX', 'horiz-adv-x'],
      ['horizOriginX', 'horiz-origin-x'],
      ['imageRendering', 'image-rendering'],
      ['letterSpacing', 'letter-spacing'],
      ['lightingColor', 'lighting-color'],
      ['markerEnd', 'marker-end'],
      ['markerMid', 'marker-mid'],
      ['markerStart', 'marker-start'],
      ['overlinePosition', 'overline-position'],
      ['overlineThickness', 'overline-thickness'],
      ['paintOrder', 'paint-order'],
      ['panose-1', 'panose-1'],
      ['pointerEvents', 'pointer-events'],
      ['renderingIntent', 'rendering-intent'],
      ['shapeRendering', 'shape-rendering'],
      ['stopColor', 'stop-color'],
      ['stopOpacity', 'stop-opacity'],
      ['strikethroughPosition', 'strikethrough-position'],
      ['strikethroughThickness', 'strikethrough-thickness'],
      ['strokeDasharray', 'stroke-dasharray'],
      ['strokeDashoffset', 'stroke-dashoffset'],
      ['strokeLinecap', 'stroke-linecap'],
      ['strokeLinejoin', 'stroke-linejoin'],
      ['strokeMiterlimit', 'stroke-miterlimit'],
      ['strokeOpacity', 'stroke-opacity'],
      ['strokeWidth', 'stroke-width'],
      ['textAnchor', 'text-anchor'],
      ['textDecoration', 'text-decoration'],
      ['textRendering', 'text-rendering'],
      ['transformOrigin', 'transform-origin'],
      ['underlinePosition', 'underline-position'],
      ['underlineThickness', 'underline-thickness'],
      ['unicodeBidi', 'unicode-bidi'],
      ['unicodeRange', 'unicode-range'],
      ['unitsPerEm', 'units-per-em'],
      ['vAlphabetic', 'v-alphabetic'],
      ['vHanging', 'v-hanging'],
      ['vIdeographic', 'v-ideographic'],
      ['vMathematical', 'v-mathematical'],
      ['vectorEffect', 'vector-effect'],
      ['vertAdvY', 'vert-adv-y'],
      ['vertOriginX', 'vert-origin-x'],
      ['vertOriginY', 'vert-origin-y'],
      ['wordSpacing', 'word-spacing'],
      ['writingMode', 'writing-mode'],
      ['xmlnsXlink', 'xmlns:xlink'],
      ['xHeight', 'x-height'],
    ]),
    Tp =
      /^[\u0000-\u001F ]*j[\r\n\t]*a[\r\n\t]*v[\r\n\t]*a[\r\n\t]*s[\r\n\t]*c[\r\n\t]*r[\r\n\t]*i[\r\n\t]*p[\r\n\t]*t[\r\n\t]*:/i;
  function _i(e) {
    return Tp.test('' + e)
      ? "javascript:throw new Error('React has blocked a javascript: URL as a security precaution.')"
      : e;
  }
  function ra() {}
  var gr = null;
  function br(e) {
    return (
      (e = e.target || e.srcElement || window),
      e.correspondingUseElement && (e = e.correspondingUseElement),
      e.nodeType === 3 ? e.parentNode : e
    );
  }
  var Ln = null,
    Yn = null;
  function jo(e) {
    var t = Un(e);
    if (t && (e = t.stateNode)) {
      var a = e[gt] || null;
      e: switch (((e = t.stateNode), t.type)) {
        case 'input':
          if (
            (mr(
              e,
              a.value,
              a.defaultValue,
              a.defaultValue,
              a.checked,
              a.defaultChecked,
              a.type,
              a.name,
            ),
            (t = a.name),
            a.type === 'radio' && t != null)
          ) {
            for (a = e; a.parentNode; ) a = a.parentNode;
            for (
              a = a.querySelectorAll(
                'input[name="' + kt('' + t) + '"][type="radio"]',
              ),
                t = 0;
              t < a.length;
              t++
            ) {
              var n = a[t];
              if (n !== e && n.form === e.form) {
                var i = n[gt] || null;
                if (!i) throw Error(c(90));
                mr(
                  n,
                  i.value,
                  i.defaultValue,
                  i.defaultValue,
                  i.checked,
                  i.defaultChecked,
                  i.type,
                  i.name,
                );
              }
            }
            for (t = 0; t < a.length; t++)
              ((n = a[t]), n.form === e.form && xo(n));
          }
          break e;
        case 'textarea':
          Eo(e, a.value, a.defaultValue);
          break e;
        case 'select':
          ((t = a.value), t != null && Bn(e, !!a.multiple, t, !1));
      }
    }
  }
  var vr = !1;
  function No(e, t, a) {
    if (vr) return e(t, a);
    vr = !0;
    try {
      var n = e(t);
      return n;
    } finally {
      if (
        ((vr = !1),
        (Ln !== null || Yn !== null) &&
          (gs(), Ln && ((t = Ln), (e = Yn), (Yn = Ln = null), jo(t), e)))
      )
        for (t = 0; t < e.length; t++) jo(e[t]);
    }
  }
  function jl(e, t) {
    var a = e.stateNode;
    if (a === null) return null;
    var n = a[gt] || null;
    if (n === null) return null;
    a = n[t];
    e: switch (t) {
      case 'onClick':
      case 'onClickCapture':
      case 'onDoubleClick':
      case 'onDoubleClickCapture':
      case 'onMouseDown':
      case 'onMouseDownCapture':
      case 'onMouseMove':
      case 'onMouseMoveCapture':
      case 'onMouseUp':
      case 'onMouseUpCapture':
      case 'onMouseEnter':
        ((n = !n.disabled) ||
          ((e = e.type),
          (n = !(
            e === 'button' ||
            e === 'input' ||
            e === 'select' ||
            e === 'textarea'
          ))),
          (e = !n));
        break e;
      default:
        e = !1;
    }
    if (e) return null;
    if (a && typeof a != 'function') throw Error(c(231, t, typeof a));
    return a;
  }
  var ua = !(
      typeof window > 'u' ||
      typeof window.document > 'u' ||
      typeof window.document.createElement > 'u'
    ),
    xr = !1;
  if (ua)
    try {
      var Nl = {};
      (Object.defineProperty(Nl, 'passive', {
        get: function () {
          xr = !0;
        },
      }),
        window.addEventListener('test', Nl, Nl),
        window.removeEventListener('test', Nl, Nl));
    } catch {
      xr = !1;
    }
  var Oa = null,
    Sr = null,
    Oi = null;
  function Ro() {
    if (Oi) return Oi;
    var e,
      t = Sr,
      a = t.length,
      n,
      i = 'value' in Oa ? Oa.value : Oa.textContent,
      s = i.length;
    for (e = 0; e < a && t[e] === i[e]; e++);
    var o = a - e;
    for (n = 1; n <= o && t[a - n] === i[s - n]; n++);
    return (Oi = i.slice(e, 1 < n ? 1 - n : void 0));
  }
  function Ci(e) {
    var t = e.keyCode;
    return (
      'charCode' in e
        ? ((e = e.charCode), e === 0 && t === 13 && (e = 13))
        : (e = t),
      e === 10 && (e = 13),
      32 <= e || e === 13 ? e : 0
    );
  }
  function Mi() {
    return !0;
  }
  function zo() {
    return !1;
  }
  function bt(e) {
    function t(a, n, i, s, o) {
      ((this._reactName = a),
        (this._targetInst = i),
        (this.type = n),
        (this.nativeEvent = s),
        (this.target = o),
        (this.currentTarget = null));
      for (var y in e)
        e.hasOwnProperty(y) && ((a = e[y]), (this[y] = a ? a(s) : s[y]));
      return (
        (this.isDefaultPrevented = (
          s.defaultPrevented != null ? s.defaultPrevented : s.returnValue === !1
        )
          ? Mi
          : zo),
        (this.isPropagationStopped = zo),
        this
      );
    }
    return (
      b(t.prototype, {
        preventDefault: function () {
          this.defaultPrevented = !0;
          var a = this.nativeEvent;
          a &&
            (a.preventDefault
              ? a.preventDefault()
              : typeof a.returnValue != 'unknown' && (a.returnValue = !1),
            (this.isDefaultPrevented = Mi));
        },
        stopPropagation: function () {
          var a = this.nativeEvent;
          a &&
            (a.stopPropagation
              ? a.stopPropagation()
              : typeof a.cancelBubble != 'unknown' && (a.cancelBubble = !0),
            (this.isPropagationStopped = Mi));
        },
        persist: function () {},
        isPersistent: Mi,
      }),
      t
    );
  }
  var on = {
      eventPhase: 0,
      bubbles: 0,
      cancelable: 0,
      timeStamp: function (e) {
        return e.timeStamp || Date.now();
      },
      defaultPrevented: 0,
      isTrusted: 0,
    },
    Di = bt(on),
    Rl = b({}, on, { view: 0, detail: 0 }),
    Ap = bt(Rl),
    Er,
    Tr,
    zl,
    Ui = b({}, Rl, {
      screenX: 0,
      screenY: 0,
      clientX: 0,
      clientY: 0,
      pageX: 0,
      pageY: 0,
      ctrlKey: 0,
      shiftKey: 0,
      altKey: 0,
      metaKey: 0,
      getModifierState: wr,
      button: 0,
      buttons: 0,
      relatedTarget: function (e) {
        return e.relatedTarget === void 0
          ? e.fromElement === e.srcElement
            ? e.toElement
            : e.fromElement
          : e.relatedTarget;
      },
      movementX: function (e) {
        return 'movementX' in e
          ? e.movementX
          : (e !== zl &&
              (zl && e.type === 'mousemove'
                ? ((Er = e.screenX - zl.screenX), (Tr = e.screenY - zl.screenY))
                : (Tr = Er = 0),
              (zl = e)),
            Er);
      },
      movementY: function (e) {
        return 'movementY' in e ? e.movementY : Tr;
      },
    }),
    _o = bt(Ui),
    wp = b({}, Ui, { dataTransfer: 0 }),
    jp = bt(wp),
    Np = b({}, Rl, { relatedTarget: 0 }),
    Ar = bt(Np),
    Rp = b({}, on, { animationName: 0, elapsedTime: 0, pseudoElement: 0 }),
    zp = bt(Rp),
    _p = b({}, on, {
      clipboardData: function (e) {
        return 'clipboardData' in e ? e.clipboardData : window.clipboardData;
      },
    }),
    Op = bt(_p),
    Cp = b({}, on, { data: 0 }),
    Oo = bt(Cp),
    Mp = {
      Esc: 'Escape',
      Spacebar: ' ',
      Left: 'ArrowLeft',
      Up: 'ArrowUp',
      Right: 'ArrowRight',
      Down: 'ArrowDown',
      Del: 'Delete',
      Win: 'OS',
      Menu: 'ContextMenu',
      Apps: 'ContextMenu',
      Scroll: 'ScrollLock',
      MozPrintableKey: 'Unidentified',
    },
    Dp = {
      8: 'Backspace',
      9: 'Tab',
      12: 'Clear',
      13: 'Enter',
      16: 'Shift',
      17: 'Control',
      18: 'Alt',
      19: 'Pause',
      20: 'CapsLock',
      27: 'Escape',
      32: ' ',
      33: 'PageUp',
      34: 'PageDown',
      35: 'End',
      36: 'Home',
      37: 'ArrowLeft',
      38: 'ArrowUp',
      39: 'ArrowRight',
      40: 'ArrowDown',
      45: 'Insert',
      46: 'Delete',
      112: 'F1',
      113: 'F2',
      114: 'F3',
      115: 'F4',
      116: 'F5',
      117: 'F6',
      118: 'F7',
      119: 'F8',
      120: 'F9',
      121: 'F10',
      122: 'F11',
      123: 'F12',
      144: 'NumLock',
      145: 'ScrollLock',
      224: 'Meta',
    },
    Up = {
      Alt: 'altKey',
      Control: 'ctrlKey',
      Meta: 'metaKey',
      Shift: 'shiftKey',
    };
  function kp(e) {
    var t = this.nativeEvent;
    return t.getModifierState
      ? t.getModifierState(e)
      : (e = Up[e])
        ? !!t[e]
        : !1;
  }
  function wr() {
    return kp;
  }
  var Hp = b({}, Rl, {
      key: function (e) {
        if (e.key) {
          var t = Mp[e.key] || e.key;
          if (t !== 'Unidentified') return t;
        }
        return e.type === 'keypress'
          ? ((e = Ci(e)), e === 13 ? 'Enter' : String.fromCharCode(e))
          : e.type === 'keydown' || e.type === 'keyup'
            ? Dp[e.keyCode] || 'Unidentified'
            : '';
      },
      code: 0,
      location: 0,
      ctrlKey: 0,
      shiftKey: 0,
      altKey: 0,
      metaKey: 0,
      repeat: 0,
      locale: 0,
      getModifierState: wr,
      charCode: function (e) {
        return e.type === 'keypress' ? Ci(e) : 0;
      },
      keyCode: function (e) {
        return e.type === 'keydown' || e.type === 'keyup' ? e.keyCode : 0;
      },
      which: function (e) {
        return e.type === 'keypress'
          ? Ci(e)
          : e.type === 'keydown' || e.type === 'keyup'
            ? e.keyCode
            : 0;
      },
    }),
    Bp = bt(Hp),
    qp = b({}, Ui, {
      pointerId: 0,
      width: 0,
      height: 0,
      pressure: 0,
      tangentialPressure: 0,
      tiltX: 0,
      tiltY: 0,
      twist: 0,
      pointerType: 0,
      isPrimary: 0,
    }),
    Co = bt(qp),
    Lp = b({}, Rl, {
      touches: 0,
      targetTouches: 0,
      changedTouches: 0,
      altKey: 0,
      metaKey: 0,
      ctrlKey: 0,
      shiftKey: 0,
      getModifierState: wr,
    }),
    Yp = bt(Lp),
    Gp = b({}, on, { propertyName: 0, elapsedTime: 0, pseudoElement: 0 }),
    Xp = bt(Gp),
    Zp = b({}, Ui, {
      deltaX: function (e) {
        return 'deltaX' in e
          ? e.deltaX
          : 'wheelDeltaX' in e
            ? -e.wheelDeltaX
            : 0;
      },
      deltaY: function (e) {
        return 'deltaY' in e
          ? e.deltaY
          : 'wheelDeltaY' in e
            ? -e.wheelDeltaY
            : 'wheelDelta' in e
              ? -e.wheelDelta
              : 0;
      },
      deltaZ: 0,
      deltaMode: 0,
    }),
    Qp = bt(Zp),
    Vp = b({}, on, { newState: 0, oldState: 0 }),
    Kp = bt(Vp),
    Jp = [9, 13, 27, 32],
    jr = ua && 'CompositionEvent' in window,
    _l = null;
  ua && 'documentMode' in document && (_l = document.documentMode);
  var $p = ua && 'TextEvent' in window && !_l,
    Mo = ua && (!jr || (_l && 8 < _l && 11 >= _l)),
    Do = ' ',
    Uo = !1;
  function ko(e, t) {
    switch (e) {
      case 'keyup':
        return Jp.indexOf(t.keyCode) !== -1;
      case 'keydown':
        return t.keyCode !== 229;
      case 'keypress':
      case 'mousedown':
      case 'focusout':
        return !0;
      default:
        return !1;
    }
  }
  function Ho(e) {
    return (
      (e = e.detail),
      typeof e == 'object' && 'data' in e ? e.data : null
    );
  }
  var Gn = !1;
  function Wp(e, t) {
    switch (e) {
      case 'compositionend':
        return Ho(t);
      case 'keypress':
        return t.which !== 32 ? null : ((Uo = !0), Do);
      case 'textInput':
        return ((e = t.data), e === Do && Uo ? null : e);
      default:
        return null;
    }
  }
  function Fp(e, t) {
    if (Gn)
      return e === 'compositionend' || (!jr && ko(e, t))
        ? ((e = Ro()), (Oi = Sr = Oa = null), (Gn = !1), e)
        : null;
    switch (e) {
      case 'paste':
        return null;
      case 'keypress':
        if (!(t.ctrlKey || t.altKey || t.metaKey) || (t.ctrlKey && t.altKey)) {
          if (t.char && 1 < t.char.length) return t.char;
          if (t.which) return String.fromCharCode(t.which);
        }
        return null;
      case 'compositionend':
        return Mo && t.locale !== 'ko' ? null : t.data;
      default:
        return null;
    }
  }
  var Ip = {
    color: !0,
    date: !0,
    datetime: !0,
    'datetime-local': !0,
    email: !0,
    month: !0,
    number: !0,
    password: !0,
    range: !0,
    search: !0,
    tel: !0,
    text: !0,
    time: !0,
    url: !0,
    week: !0,
  };
  function Bo(e) {
    var t = e && e.nodeName && e.nodeName.toLowerCase();
    return t === 'input' ? !!Ip[e.type] : t === 'textarea';
  }
  function qo(e, t, a, n) {
    (Ln ? (Yn ? Yn.push(n) : (Yn = [n])) : (Ln = n),
      (t = As(t, 'onChange')),
      0 < t.length &&
        ((a = new Di('onChange', 'change', null, a, n)),
        e.push({ event: a, listeners: t })));
  }
  var Ol = null,
    Cl = null;
  function Pp(e) {
    Eh(e, 0);
  }
  function ki(e) {
    var t = wl(e);
    if (xo(t)) return e;
  }
  function Lo(e, t) {
    if (e === 'change') return t;
  }
  var Yo = !1;
  if (ua) {
    var Nr;
    if (ua) {
      var Rr = 'oninput' in document;
      if (!Rr) {
        var Go = document.createElement('div');
        (Go.setAttribute('oninput', 'return;'),
          (Rr = typeof Go.oninput == 'function'));
      }
      Nr = Rr;
    } else Nr = !1;
    Yo = Nr && (!document.documentMode || 9 < document.documentMode);
  }
  function Xo() {
    Ol && (Ol.detachEvent('onpropertychange', Zo), (Cl = Ol = null));
  }
  function Zo(e) {
    if (e.propertyName === 'value' && ki(Cl)) {
      var t = [];
      (qo(t, Cl, e, br(e)), No(Pp, t));
    }
  }
  function eg(e, t, a) {
    e === 'focusin'
      ? (Xo(), (Ol = t), (Cl = a), Ol.attachEvent('onpropertychange', Zo))
      : e === 'focusout' && Xo();
  }
  function tg(e) {
    if (e === 'selectionchange' || e === 'keyup' || e === 'keydown')
      return ki(Cl);
  }
  function ag(e, t) {
    if (e === 'click') return ki(t);
  }
  function ng(e, t) {
    if (e === 'input' || e === 'change') return ki(t);
  }
  function lg(e, t) {
    return (e === t && (e !== 0 || 1 / e === 1 / t)) || (e !== e && t !== t);
  }
  var Nt = typeof Object.is == 'function' ? Object.is : lg;
  function Ml(e, t) {
    if (Nt(e, t)) return !0;
    if (
      typeof e != 'object' ||
      e === null ||
      typeof t != 'object' ||
      t === null
    )
      return !1;
    var a = Object.keys(e),
      n = Object.keys(t);
    if (a.length !== n.length) return !1;
    for (n = 0; n < a.length; n++) {
      var i = a[n];
      if (!xl.call(t, i) || !Nt(e[i], t[i])) return !1;
    }
    return !0;
  }
  function Qo(e) {
    for (; e && e.firstChild; ) e = e.firstChild;
    return e;
  }
  function Vo(e, t) {
    var a = Qo(e);
    e = 0;
    for (var n; a; ) {
      if (a.nodeType === 3) {
        if (((n = e + a.textContent.length), e <= t && n >= t))
          return { node: a, offset: t - e };
        e = n;
      }
      e: {
        for (; a; ) {
          if (a.nextSibling) {
            a = a.nextSibling;
            break e;
          }
          a = a.parentNode;
        }
        a = void 0;
      }
      a = Qo(a);
    }
  }
  function Ko(e, t) {
    return e && t
      ? e === t
        ? !0
        : e && e.nodeType === 3
          ? !1
          : t && t.nodeType === 3
            ? Ko(e, t.parentNode)
            : 'contains' in e
              ? e.contains(t)
              : e.compareDocumentPosition
                ? !!(e.compareDocumentPosition(t) & 16)
                : !1
      : !1;
  }
  function Jo(e) {
    e =
      e != null &&
      e.ownerDocument != null &&
      e.ownerDocument.defaultView != null
        ? e.ownerDocument.defaultView
        : window;
    for (var t = zi(e.document); t instanceof e.HTMLIFrameElement; ) {
      try {
        var a = typeof t.contentWindow.location.href == 'string';
      } catch {
        a = !1;
      }
      if (a) e = t.contentWindow;
      else break;
      t = zi(e.document);
    }
    return t;
  }
  function zr(e) {
    var t = e && e.nodeName && e.nodeName.toLowerCase();
    return (
      t &&
      ((t === 'input' &&
        (e.type === 'text' ||
          e.type === 'search' ||
          e.type === 'tel' ||
          e.type === 'url' ||
          e.type === 'password')) ||
        t === 'textarea' ||
        e.contentEditable === 'true')
    );
  }
  var ig = ua && 'documentMode' in document && 11 >= document.documentMode,
    Xn = null,
    _r = null,
    Dl = null,
    Or = !1;
  function $o(e, t, a) {
    var n =
      a.window === a ? a.document : a.nodeType === 9 ? a : a.ownerDocument;
    Or ||
      Xn == null ||
      Xn !== zi(n) ||
      ((n = Xn),
      'selectionStart' in n && zr(n)
        ? (n = { start: n.selectionStart, end: n.selectionEnd })
        : ((n = (
            (n.ownerDocument && n.ownerDocument.defaultView) ||
            window
          ).getSelection()),
          (n = {
            anchorNode: n.anchorNode,
            anchorOffset: n.anchorOffset,
            focusNode: n.focusNode,
            focusOffset: n.focusOffset,
          })),
      (Dl && Ml(Dl, n)) ||
        ((Dl = n),
        (n = As(_r, 'onSelect')),
        0 < n.length &&
          ((t = new Di('onSelect', 'select', null, t, a)),
          e.push({ event: t, listeners: n }),
          (t.target = Xn))));
  }
  function fn(e, t) {
    var a = {};
    return (
      (a[e.toLowerCase()] = t.toLowerCase()),
      (a['Webkit' + e] = 'webkit' + t),
      (a['Moz' + e] = 'moz' + t),
      a
    );
  }
  var Zn = {
      animationend: fn('Animation', 'AnimationEnd'),
      animationiteration: fn('Animation', 'AnimationIteration'),
      animationstart: fn('Animation', 'AnimationStart'),
      transitionrun: fn('Transition', 'TransitionRun'),
      transitionstart: fn('Transition', 'TransitionStart'),
      transitioncancel: fn('Transition', 'TransitionCancel'),
      transitionend: fn('Transition', 'TransitionEnd'),
    },
    Cr = {},
    Wo = {};
  ua &&
    ((Wo = document.createElement('div').style),
    'AnimationEvent' in window ||
      (delete Zn.animationend.animation,
      delete Zn.animationiteration.animation,
      delete Zn.animationstart.animation),
    'TransitionEvent' in window || delete Zn.transitionend.transition);
  function dn(e) {
    if (Cr[e]) return Cr[e];
    if (!Zn[e]) return e;
    var t = Zn[e],
      a;
    for (a in t) if (t.hasOwnProperty(a) && a in Wo) return (Cr[e] = t[a]);
    return e;
  }
  var Fo = dn('animationend'),
    Io = dn('animationiteration'),
    Po = dn('animationstart'),
    sg = dn('transitionrun'),
    rg = dn('transitionstart'),
    ug = dn('transitioncancel'),
    ef = dn('transitionend'),
    tf = new Map(),
    Mr =
      'abort auxClick beforeToggle cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel'.split(
        ' ',
      );
  Mr.push('scrollEnd');
  function Vt(e, t) {
    (tf.set(e, t), cn(t, [e]));
  }
  var Hi =
      typeof reportError == 'function'
        ? reportError
        : function (e) {
            if (
              typeof window == 'object' &&
              typeof window.ErrorEvent == 'function'
            ) {
              var t = new window.ErrorEvent('error', {
                bubbles: !0,
                cancelable: !0,
                message:
                  typeof e == 'object' &&
                  e !== null &&
                  typeof e.message == 'string'
                    ? String(e.message)
                    : String(e),
                error: e,
              });
              if (!window.dispatchEvent(t)) return;
            } else if (
              typeof process == 'object' &&
              typeof process.emit == 'function'
            ) {
              process.emit('uncaughtException', e);
              return;
            }
            console.error(e);
          },
    Ht = [],
    Qn = 0,
    Dr = 0;
  function Bi() {
    for (var e = Qn, t = (Dr = Qn = 0); t < e; ) {
      var a = Ht[t];
      Ht[t++] = null;
      var n = Ht[t];
      Ht[t++] = null;
      var i = Ht[t];
      Ht[t++] = null;
      var s = Ht[t];
      if (((Ht[t++] = null), n !== null && i !== null)) {
        var o = n.pending;
        (o === null ? (i.next = i) : ((i.next = o.next), (o.next = i)),
          (n.pending = i));
      }
      s !== 0 && af(a, i, s);
    }
  }
  function qi(e, t, a, n) {
    ((Ht[Qn++] = e),
      (Ht[Qn++] = t),
      (Ht[Qn++] = a),
      (Ht[Qn++] = n),
      (Dr |= n),
      (e.lanes |= n),
      (e = e.alternate),
      e !== null && (e.lanes |= n));
  }
  function Ur(e, t, a, n) {
    return (qi(e, t, a, n), Li(e));
  }
  function hn(e, t) {
    return (qi(e, null, null, t), Li(e));
  }
  function af(e, t, a) {
    e.lanes |= a;
    var n = e.alternate;
    n !== null && (n.lanes |= a);
    for (var i = !1, s = e.return; s !== null; )
      ((s.childLanes |= a),
        (n = s.alternate),
        n !== null && (n.childLanes |= a),
        s.tag === 22 &&
          ((e = s.stateNode), e === null || e._visibility & 1 || (i = !0)),
        (e = s),
        (s = s.return));
    return e.tag === 3
      ? ((s = e.stateNode),
        i &&
          t !== null &&
          ((i = 31 - jt(a)),
          (e = s.hiddenUpdates),
          (n = e[i]),
          n === null ? (e[i] = [t]) : n.push(t),
          (t.lane = a | 536870912)),
        s)
      : null;
  }
  function Li(e) {
    if (50 < ai) throw ((ai = 0), (Zu = null), Error(c(185)));
    for (var t = e.return; t !== null; ) ((e = t), (t = e.return));
    return e.tag === 3 ? e.stateNode : null;
  }
  var Vn = {};
  function cg(e, t, a, n) {
    ((this.tag = e),
      (this.key = a),
      (this.sibling =
        this.child =
        this.return =
        this.stateNode =
        this.type =
        this.elementType =
          null),
      (this.index = 0),
      (this.refCleanup = this.ref = null),
      (this.pendingProps = t),
      (this.dependencies =
        this.memoizedState =
        this.updateQueue =
        this.memoizedProps =
          null),
      (this.mode = n),
      (this.subtreeFlags = this.flags = 0),
      (this.deletions = null),
      (this.childLanes = this.lanes = 0),
      (this.alternate = null));
  }
  function Rt(e, t, a, n) {
    return new cg(e, t, a, n);
  }
  function kr(e) {
    return ((e = e.prototype), !(!e || !e.isReactComponent));
  }
  function ca(e, t) {
    var a = e.alternate;
    return (
      a === null
        ? ((a = Rt(e.tag, t, e.key, e.mode)),
          (a.elementType = e.elementType),
          (a.type = e.type),
          (a.stateNode = e.stateNode),
          (a.alternate = e),
          (e.alternate = a))
        : ((a.pendingProps = t),
          (a.type = e.type),
          (a.flags = 0),
          (a.subtreeFlags = 0),
          (a.deletions = null)),
      (a.flags = e.flags & 65011712),
      (a.childLanes = e.childLanes),
      (a.lanes = e.lanes),
      (a.child = e.child),
      (a.memoizedProps = e.memoizedProps),
      (a.memoizedState = e.memoizedState),
      (a.updateQueue = e.updateQueue),
      (t = e.dependencies),
      (a.dependencies =
        t === null ? null : { lanes: t.lanes, firstContext: t.firstContext }),
      (a.sibling = e.sibling),
      (a.index = e.index),
      (a.ref = e.ref),
      (a.refCleanup = e.refCleanup),
      a
    );
  }
  function nf(e, t) {
    e.flags &= 65011714;
    var a = e.alternate;
    return (
      a === null
        ? ((e.childLanes = 0),
          (e.lanes = t),
          (e.child = null),
          (e.subtreeFlags = 0),
          (e.memoizedProps = null),
          (e.memoizedState = null),
          (e.updateQueue = null),
          (e.dependencies = null),
          (e.stateNode = null))
        : ((e.childLanes = a.childLanes),
          (e.lanes = a.lanes),
          (e.child = a.child),
          (e.subtreeFlags = 0),
          (e.deletions = null),
          (e.memoizedProps = a.memoizedProps),
          (e.memoizedState = a.memoizedState),
          (e.updateQueue = a.updateQueue),
          (e.type = a.type),
          (t = a.dependencies),
          (e.dependencies =
            t === null
              ? null
              : { lanes: t.lanes, firstContext: t.firstContext })),
      e
    );
  }
  function Yi(e, t, a, n, i, s) {
    var o = 0;
    if (((n = e), typeof e == 'function')) kr(e) && (o = 1);
    else if (typeof e == 'string')
      o = mb(e, a, N.current)
        ? 26
        : e === 'html' || e === 'head' || e === 'body'
          ? 27
          : 5;
    else
      e: switch (e) {
        case ye:
          return (
            (e = Rt(31, a, t, i)),
            (e.elementType = ye),
            (e.lanes = s),
            e
          );
        case B:
          return mn(a.children, i, s, t);
        case D:
          ((o = 8), (i |= 24));
          break;
        case k:
          return (
            (e = Rt(12, a, t, i | 2)),
            (e.elementType = k),
            (e.lanes = s),
            e
          );
        case ne:
          return (
            (e = Rt(13, a, t, i)),
            (e.elementType = ne),
            (e.lanes = s),
            e
          );
        case W:
          return ((e = Rt(19, a, t, i)), (e.elementType = W), (e.lanes = s), e);
        default:
          if (typeof e == 'object' && e !== null)
            switch (e.$$typeof) {
              case F:
                o = 10;
                break e;
              case te:
                o = 9;
                break e;
              case I:
                o = 11;
                break e;
              case J:
                o = 14;
                break e;
              case Z:
                ((o = 16), (n = null));
                break e;
            }
          ((o = 29),
            (a = Error(c(130, e === null ? 'null' : typeof e, ''))),
            (n = null));
      }
    return (
      (t = Rt(o, a, t, i)),
      (t.elementType = e),
      (t.type = n),
      (t.lanes = s),
      t
    );
  }
  function mn(e, t, a, n) {
    return ((e = Rt(7, e, n, t)), (e.lanes = a), e);
  }
  function Hr(e, t, a) {
    return ((e = Rt(6, e, null, t)), (e.lanes = a), e);
  }
  function lf(e) {
    var t = Rt(18, null, null, 0);
    return ((t.stateNode = e), t);
  }
  function Br(e, t, a) {
    return (
      (t = Rt(4, e.children !== null ? e.children : [], e.key, t)),
      (t.lanes = a),
      (t.stateNode = {
        containerInfo: e.containerInfo,
        pendingChildren: null,
        implementation: e.implementation,
      }),
      t
    );
  }
  var sf = new WeakMap();
  function Bt(e, t) {
    if (typeof e == 'object' && e !== null) {
      var a = sf.get(e);
      return a !== void 0
        ? a
        : ((t = { value: e, source: t, stack: rn(t) }), sf.set(e, t), t);
    }
    return { value: e, source: t, stack: rn(t) };
  }
  var Kn = [],
    Jn = 0,
    Gi = null,
    Ul = 0,
    qt = [],
    Lt = 0,
    Ca = null,
    Wt = 1,
    Ft = '';
  function oa(e, t) {
    ((Kn[Jn++] = Ul), (Kn[Jn++] = Gi), (Gi = e), (Ul = t));
  }
  function rf(e, t, a) {
    ((qt[Lt++] = Wt), (qt[Lt++] = Ft), (qt[Lt++] = Ca), (Ca = e));
    var n = Wt;
    e = Ft;
    var i = 32 - jt(n) - 1;
    ((n &= ~(1 << i)), (a += 1));
    var s = 32 - jt(t) + i;
    if (30 < s) {
      var o = i - (i % 5);
      ((s = (n & ((1 << o) - 1)).toString(32)),
        (n >>= o),
        (i -= o),
        (Wt = (1 << (32 - jt(t) + i)) | (a << i) | n),
        (Ft = s + e));
    } else ((Wt = (1 << s) | (a << i) | n), (Ft = e));
  }
  function qr(e) {
    e.return !== null && (oa(e, 1), rf(e, 1, 0));
  }
  function Lr(e) {
    for (; e === Gi; )
      ((Gi = Kn[--Jn]), (Kn[Jn] = null), (Ul = Kn[--Jn]), (Kn[Jn] = null));
    for (; e === Ca; )
      ((Ca = qt[--Lt]),
        (qt[Lt] = null),
        (Ft = qt[--Lt]),
        (qt[Lt] = null),
        (Wt = qt[--Lt]),
        (qt[Lt] = null));
  }
  function uf(e, t) {
    ((qt[Lt++] = Wt),
      (qt[Lt++] = Ft),
      (qt[Lt++] = Ca),
      (Wt = t.id),
      (Ft = t.overflow),
      (Ca = e));
  }
  var ot = null,
    Ge = null,
    Ne = !1,
    Ma = null,
    Yt = !1,
    Yr = Error(c(519));
  function Da(e) {
    var t = Error(
      c(
        418,
        1 < arguments.length && arguments[1] !== void 0 && arguments[1]
          ? 'text'
          : 'HTML',
        '',
      ),
    );
    throw (kl(Bt(t, e)), Yr);
  }
  function cf(e) {
    var t = e.stateNode,
      a = e.type,
      n = e.memoizedProps;
    switch (((t[ct] = e), (t[gt] = n), a)) {
      case 'dialog':
        (Ae('cancel', t), Ae('close', t));
        break;
      case 'iframe':
      case 'object':
      case 'embed':
        Ae('load', t);
        break;
      case 'video':
      case 'audio':
        for (a = 0; a < li.length; a++) Ae(li[a], t);
        break;
      case 'source':
        Ae('error', t);
        break;
      case 'img':
      case 'image':
      case 'link':
        (Ae('error', t), Ae('load', t));
        break;
      case 'details':
        Ae('toggle', t);
        break;
      case 'input':
        (Ae('invalid', t),
          So(
            t,
            n.value,
            n.defaultValue,
            n.checked,
            n.defaultChecked,
            n.type,
            n.name,
            !0,
          ));
        break;
      case 'select':
        Ae('invalid', t);
        break;
      case 'textarea':
        (Ae('invalid', t), To(t, n.value, n.defaultValue, n.children));
    }
    ((a = n.children),
      (typeof a != 'string' && typeof a != 'number' && typeof a != 'bigint') ||
      t.textContent === '' + a ||
      n.suppressHydrationWarning === !0 ||
      jh(t.textContent, a)
        ? (n.popover != null && (Ae('beforetoggle', t), Ae('toggle', t)),
          n.onScroll != null && Ae('scroll', t),
          n.onScrollEnd != null && Ae('scrollend', t),
          n.onClick != null && (t.onclick = ra),
          (t = !0))
        : (t = !1),
      t || Da(e, !0));
  }
  function of(e) {
    for (ot = e.return; ot; )
      switch (ot.tag) {
        case 5:
        case 31:
        case 13:
          Yt = !1;
          return;
        case 27:
        case 3:
          Yt = !0;
          return;
        default:
          ot = ot.return;
      }
  }
  function $n(e) {
    if (e !== ot) return !1;
    if (!Ne) return (of(e), (Ne = !0), !1);
    var t = e.tag,
      a;
    if (
      ((a = t !== 3 && t !== 27) &&
        ((a = t === 5) &&
          ((a = e.type),
          (a =
            !(a !== 'form' && a !== 'button') || ic(e.type, e.memoizedProps))),
        (a = !a)),
      a && Ge && Da(e),
      of(e),
      t === 13)
    ) {
      if (((e = e.memoizedState), (e = e !== null ? e.dehydrated : null), !e))
        throw Error(c(317));
      Ge = Uh(e);
    } else if (t === 31) {
      if (((e = e.memoizedState), (e = e !== null ? e.dehydrated : null), !e))
        throw Error(c(317));
      Ge = Uh(e);
    } else
      t === 27
        ? ((t = Ge), Ja(e.type) ? ((e = oc), (oc = null), (Ge = e)) : (Ge = t))
        : (Ge = ot ? Xt(e.stateNode.nextSibling) : null);
    return !0;
  }
  function yn() {
    ((Ge = ot = null), (Ne = !1));
  }
  function Gr() {
    var e = Ma;
    return (
      e !== null &&
        (Et === null ? (Et = e) : Et.push.apply(Et, e), (Ma = null)),
      e
    );
  }
  function kl(e) {
    Ma === null ? (Ma = [e]) : Ma.push(e);
  }
  var Xr = w(null),
    pn = null,
    fa = null;
  function Ua(e, t, a) {
    (A(Xr, t._currentValue), (t._currentValue = a));
  }
  function da(e) {
    ((e._currentValue = Xr.current), g(Xr));
  }
  function Zr(e, t, a) {
    for (; e !== null; ) {
      var n = e.alternate;
      if (
        ((e.childLanes & t) !== t
          ? ((e.childLanes |= t), n !== null && (n.childLanes |= t))
          : n !== null && (n.childLanes & t) !== t && (n.childLanes |= t),
        e === a)
      )
        break;
      e = e.return;
    }
  }
  function Qr(e, t, a, n) {
    var i = e.child;
    for (i !== null && (i.return = e); i !== null; ) {
      var s = i.dependencies;
      if (s !== null) {
        var o = i.child;
        s = s.firstContext;
        e: for (; s !== null; ) {
          var y = s;
          s = i;
          for (var T = 0; T < t.length; T++)
            if (y.context === t[T]) {
              ((s.lanes |= a),
                (y = s.alternate),
                y !== null && (y.lanes |= a),
                Zr(s.return, a, e),
                n || (o = null));
              break e;
            }
          s = y.next;
        }
      } else if (i.tag === 18) {
        if (((o = i.return), o === null)) throw Error(c(341));
        ((o.lanes |= a),
          (s = o.alternate),
          s !== null && (s.lanes |= a),
          Zr(o, a, e),
          (o = null));
      } else o = i.child;
      if (o !== null) o.return = i;
      else
        for (o = i; o !== null; ) {
          if (o === e) {
            o = null;
            break;
          }
          if (((i = o.sibling), i !== null)) {
            ((i.return = o.return), (o = i));
            break;
          }
          o = o.return;
        }
      i = o;
    }
  }
  function Wn(e, t, a, n) {
    e = null;
    for (var i = t, s = !1; i !== null; ) {
      if (!s) {
        if ((i.flags & 524288) !== 0) s = !0;
        else if ((i.flags & 262144) !== 0) break;
      }
      if (i.tag === 10) {
        var o = i.alternate;
        if (o === null) throw Error(c(387));
        if (((o = o.memoizedProps), o !== null)) {
          var y = i.type;
          Nt(i.pendingProps.value, o.value) ||
            (e !== null ? e.push(y) : (e = [y]));
        }
      } else if (i === P.current) {
        if (((o = i.alternate), o === null)) throw Error(c(387));
        o.memoizedState.memoizedState !== i.memoizedState.memoizedState &&
          (e !== null ? e.push(ci) : (e = [ci]));
      }
      i = i.return;
    }
    (e !== null && Qr(t, e, a, n), (t.flags |= 262144));
  }
  function Xi(e) {
    for (e = e.firstContext; e !== null; ) {
      if (!Nt(e.context._currentValue, e.memoizedValue)) return !0;
      e = e.next;
    }
    return !1;
  }
  function gn(e) {
    ((pn = e),
      (fa = null),
      (e = e.dependencies),
      e !== null && (e.firstContext = null));
  }
  function ft(e) {
    return ff(pn, e);
  }
  function Zi(e, t) {
    return (pn === null && gn(e), ff(e, t));
  }
  function ff(e, t) {
    var a = t._currentValue;
    if (((t = { context: t, memoizedValue: a, next: null }), fa === null)) {
      if (e === null) throw Error(c(308));
      ((fa = t),
        (e.dependencies = { lanes: 0, firstContext: t }),
        (e.flags |= 524288));
    } else fa = fa.next = t;
    return a;
  }
  var og =
      typeof AbortController < 'u'
        ? AbortController
        : function () {
            var e = [],
              t = (this.signal = {
                aborted: !1,
                addEventListener: function (a, n) {
                  e.push(n);
                },
              });
            this.abort = function () {
              ((t.aborted = !0),
                e.forEach(function (a) {
                  return a();
                }));
            };
          },
    fg = l.unstable_scheduleCallback,
    dg = l.unstable_NormalPriority,
    Ie = {
      $$typeof: F,
      Consumer: null,
      Provider: null,
      _currentValue: null,
      _currentValue2: null,
      _threadCount: 0,
    };
  function Vr() {
    return { controller: new og(), data: new Map(), refCount: 0 };
  }
  function Hl(e) {
    (e.refCount--,
      e.refCount === 0 &&
        fg(dg, function () {
          e.controller.abort();
        }));
  }
  var Bl = null,
    Kr = 0,
    Fn = 0,
    In = null;
  function hg(e, t) {
    if (Bl === null) {
      var a = (Bl = []);
      ((Kr = 0),
        (Fn = Wu()),
        (In = {
          status: 'pending',
          value: void 0,
          then: function (n) {
            a.push(n);
          },
        }));
    }
    return (Kr++, t.then(df, df), t);
  }
  function df() {
    if (--Kr === 0 && Bl !== null) {
      In !== null && (In.status = 'fulfilled');
      var e = Bl;
      ((Bl = null), (Fn = 0), (In = null));
      for (var t = 0; t < e.length; t++) (0, e[t])();
    }
  }
  function mg(e, t) {
    var a = [],
      n = {
        status: 'pending',
        value: null,
        reason: null,
        then: function (i) {
          a.push(i);
        },
      };
    return (
      e.then(
        function () {
          ((n.status = 'fulfilled'), (n.value = t));
          for (var i = 0; i < a.length; i++) (0, a[i])(t);
        },
        function (i) {
          for (n.status = 'rejected', n.reason = i, i = 0; i < a.length; i++)
            (0, a[i])(void 0);
        },
      ),
      n
    );
  }
  var hf = z.S;
  z.S = function (e, t) {
    ((Wd = At()),
      typeof t == 'object' &&
        t !== null &&
        typeof t.then == 'function' &&
        hg(e, t),
      hf !== null && hf(e, t));
  };
  var bn = w(null);
  function Jr() {
    var e = bn.current;
    return e !== null ? e : qe.pooledCache;
  }
  function Qi(e, t) {
    t === null ? A(bn, bn.current) : A(bn, t.pool);
  }
  function mf() {
    var e = Jr();
    return e === null ? null : { parent: Ie._currentValue, pool: e };
  }
  var Pn = Error(c(460)),
    $r = Error(c(474)),
    Vi = Error(c(542)),
    Ki = { then: function () {} };
  function yf(e) {
    return ((e = e.status), e === 'fulfilled' || e === 'rejected');
  }
  function pf(e, t, a) {
    switch (
      ((a = e[a]),
      a === void 0 ? e.push(t) : a !== t && (t.then(ra, ra), (t = a)),
      t.status)
    ) {
      case 'fulfilled':
        return t.value;
      case 'rejected':
        throw ((e = t.reason), bf(e), e);
      default:
        if (typeof t.status == 'string') t.then(ra, ra);
        else {
          if (((e = qe), e !== null && 100 < e.shellSuspendCounter))
            throw Error(c(482));
          ((e = t),
            (e.status = 'pending'),
            e.then(
              function (n) {
                if (t.status === 'pending') {
                  var i = t;
                  ((i.status = 'fulfilled'), (i.value = n));
                }
              },
              function (n) {
                if (t.status === 'pending') {
                  var i = t;
                  ((i.status = 'rejected'), (i.reason = n));
                }
              },
            ));
        }
        switch (t.status) {
          case 'fulfilled':
            return t.value;
          case 'rejected':
            throw ((e = t.reason), bf(e), e);
        }
        throw ((xn = t), Pn);
    }
  }
  function vn(e) {
    try {
      var t = e._init;
      return t(e._payload);
    } catch (a) {
      throw a !== null && typeof a == 'object' && typeof a.then == 'function'
        ? ((xn = a), Pn)
        : a;
    }
  }
  var xn = null;
  function gf() {
    if (xn === null) throw Error(c(459));
    var e = xn;
    return ((xn = null), e);
  }
  function bf(e) {
    if (e === Pn || e === Vi) throw Error(c(483));
  }
  var el = null,
    ql = 0;
  function Ji(e) {
    var t = ql;
    return ((ql += 1), el === null && (el = []), pf(el, e, t));
  }
  function Ll(e, t) {
    ((t = t.props.ref), (e.ref = t !== void 0 ? t : null));
  }
  function $i(e, t) {
    throw t.$$typeof === _
      ? Error(c(525))
      : ((e = Object.prototype.toString.call(t)),
        Error(
          c(
            31,
            e === '[object Object]'
              ? 'object with keys {' + Object.keys(t).join(', ') + '}'
              : e,
          ),
        ));
  }
  function vf(e) {
    function t(R, j) {
      if (e) {
        var O = R.deletions;
        O === null ? ((R.deletions = [j]), (R.flags |= 16)) : O.push(j);
      }
    }
    function a(R, j) {
      if (!e) return null;
      for (; j !== null; ) (t(R, j), (j = j.sibling));
      return null;
    }
    function n(R) {
      for (var j = new Map(); R !== null; )
        (R.key !== null ? j.set(R.key, R) : j.set(R.index, R), (R = R.sibling));
      return j;
    }
    function i(R, j) {
      return ((R = ca(R, j)), (R.index = 0), (R.sibling = null), R);
    }
    function s(R, j, O) {
      return (
        (R.index = O),
        e
          ? ((O = R.alternate),
            O !== null
              ? ((O = O.index), O < j ? ((R.flags |= 67108866), j) : O)
              : ((R.flags |= 67108866), j))
          : ((R.flags |= 1048576), j)
      );
    }
    function o(R) {
      return (e && R.alternate === null && (R.flags |= 67108866), R);
    }
    function y(R, j, O, L) {
      return j === null || j.tag !== 6
        ? ((j = Hr(O, R.mode, L)), (j.return = R), j)
        : ((j = i(j, O)), (j.return = R), j);
    }
    function T(R, j, O, L) {
      var de = O.type;
      return de === B
        ? H(R, j, O.props.children, L, O.key)
        : j !== null &&
            (j.elementType === de ||
              (typeof de == 'object' &&
                de !== null &&
                de.$$typeof === Z &&
                vn(de) === j.type))
          ? ((j = i(j, O.props)), Ll(j, O), (j.return = R), j)
          : ((j = Yi(O.type, O.key, O.props, null, R.mode, L)),
            Ll(j, O),
            (j.return = R),
            j);
    }
    function C(R, j, O, L) {
      return j === null ||
        j.tag !== 4 ||
        j.stateNode.containerInfo !== O.containerInfo ||
        j.stateNode.implementation !== O.implementation
        ? ((j = Br(O, R.mode, L)), (j.return = R), j)
        : ((j = i(j, O.children || [])), (j.return = R), j);
    }
    function H(R, j, O, L, de) {
      return j === null || j.tag !== 7
        ? ((j = mn(O, R.mode, L, de)), (j.return = R), j)
        : ((j = i(j, O)), (j.return = R), j);
    }
    function X(R, j, O) {
      if (
        (typeof j == 'string' && j !== '') ||
        typeof j == 'number' ||
        typeof j == 'bigint'
      )
        return ((j = Hr('' + j, R.mode, O)), (j.return = R), j);
      if (typeof j == 'object' && j !== null) {
        switch (j.$$typeof) {
          case V:
            return (
              (O = Yi(j.type, j.key, j.props, null, R.mode, O)),
              Ll(O, j),
              (O.return = R),
              O
            );
          case G:
            return ((j = Br(j, R.mode, O)), (j.return = R), j);
          case Z:
            return ((j = vn(j)), X(R, j, O));
        }
        if (ae(j) || Ee(j))
          return ((j = mn(j, R.mode, O, null)), (j.return = R), j);
        if (typeof j.then == 'function') return X(R, Ji(j), O);
        if (j.$$typeof === F) return X(R, Zi(R, j), O);
        $i(R, j);
      }
      return null;
    }
    function M(R, j, O, L) {
      var de = j !== null ? j.key : null;
      if (
        (typeof O == 'string' && O !== '') ||
        typeof O == 'number' ||
        typeof O == 'bigint'
      )
        return de !== null ? null : y(R, j, '' + O, L);
      if (typeof O == 'object' && O !== null) {
        switch (O.$$typeof) {
          case V:
            return O.key === de ? T(R, j, O, L) : null;
          case G:
            return O.key === de ? C(R, j, O, L) : null;
          case Z:
            return ((O = vn(O)), M(R, j, O, L));
        }
        if (ae(O) || Ee(O)) return de !== null ? null : H(R, j, O, L, null);
        if (typeof O.then == 'function') return M(R, j, Ji(O), L);
        if (O.$$typeof === F) return M(R, j, Zi(R, O), L);
        $i(R, O);
      }
      return null;
    }
    function U(R, j, O, L, de) {
      if (
        (typeof L == 'string' && L !== '') ||
        typeof L == 'number' ||
        typeof L == 'bigint'
      )
        return ((R = R.get(O) || null), y(j, R, '' + L, de));
      if (typeof L == 'object' && L !== null) {
        switch (L.$$typeof) {
          case V:
            return (
              (R = R.get(L.key === null ? O : L.key) || null),
              T(j, R, L, de)
            );
          case G:
            return (
              (R = R.get(L.key === null ? O : L.key) || null),
              C(j, R, L, de)
            );
          case Z:
            return ((L = vn(L)), U(R, j, O, L, de));
        }
        if (ae(L) || Ee(L))
          return ((R = R.get(O) || null), H(j, R, L, de, null));
        if (typeof L.then == 'function') return U(R, j, O, Ji(L), de);
        if (L.$$typeof === F) return U(R, j, O, Zi(j, L), de);
        $i(j, L);
      }
      return null;
    }
    function ie(R, j, O, L) {
      for (
        var de = null, ze = null, oe = j, ve = (j = 0), je = null;
        oe !== null && ve < O.length;
        ve++
      ) {
        oe.index > ve ? ((je = oe), (oe = null)) : (je = oe.sibling);
        var _e = M(R, oe, O[ve], L);
        if (_e === null) {
          oe === null && (oe = je);
          break;
        }
        (e && oe && _e.alternate === null && t(R, oe),
          (j = s(_e, j, ve)),
          ze === null ? (de = _e) : (ze.sibling = _e),
          (ze = _e),
          (oe = je));
      }
      if (ve === O.length) return (a(R, oe), Ne && oa(R, ve), de);
      if (oe === null) {
        for (; ve < O.length; ve++)
          ((oe = X(R, O[ve], L)),
            oe !== null &&
              ((j = s(oe, j, ve)),
              ze === null ? (de = oe) : (ze.sibling = oe),
              (ze = oe)));
        return (Ne && oa(R, ve), de);
      }
      for (oe = n(oe); ve < O.length; ve++)
        ((je = U(oe, R, ve, O[ve], L)),
          je !== null &&
            (e &&
              je.alternate !== null &&
              oe.delete(je.key === null ? ve : je.key),
            (j = s(je, j, ve)),
            ze === null ? (de = je) : (ze.sibling = je),
            (ze = je)));
      return (
        e &&
          oe.forEach(function (Pa) {
            return t(R, Pa);
          }),
        Ne && oa(R, ve),
        de
      );
    }
    function me(R, j, O, L) {
      if (O == null) throw Error(c(151));
      for (
        var de = null,
          ze = null,
          oe = j,
          ve = (j = 0),
          je = null,
          _e = O.next();
        oe !== null && !_e.done;
        ve++, _e = O.next()
      ) {
        oe.index > ve ? ((je = oe), (oe = null)) : (je = oe.sibling);
        var Pa = M(R, oe, _e.value, L);
        if (Pa === null) {
          oe === null && (oe = je);
          break;
        }
        (e && oe && Pa.alternate === null && t(R, oe),
          (j = s(Pa, j, ve)),
          ze === null ? (de = Pa) : (ze.sibling = Pa),
          (ze = Pa),
          (oe = je));
      }
      if (_e.done) return (a(R, oe), Ne && oa(R, ve), de);
      if (oe === null) {
        for (; !_e.done; ve++, _e = O.next())
          ((_e = X(R, _e.value, L)),
            _e !== null &&
              ((j = s(_e, j, ve)),
              ze === null ? (de = _e) : (ze.sibling = _e),
              (ze = _e)));
        return (Ne && oa(R, ve), de);
      }
      for (oe = n(oe); !_e.done; ve++, _e = O.next())
        ((_e = U(oe, R, ve, _e.value, L)),
          _e !== null &&
            (e &&
              _e.alternate !== null &&
              oe.delete(_e.key === null ? ve : _e.key),
            (j = s(_e, j, ve)),
            ze === null ? (de = _e) : (ze.sibling = _e),
            (ze = _e)));
      return (
        e &&
          oe.forEach(function (wb) {
            return t(R, wb);
          }),
        Ne && oa(R, ve),
        de
      );
    }
    function He(R, j, O, L) {
      if (
        (typeof O == 'object' &&
          O !== null &&
          O.type === B &&
          O.key === null &&
          (O = O.props.children),
        typeof O == 'object' && O !== null)
      ) {
        switch (O.$$typeof) {
          case V:
            e: {
              for (var de = O.key; j !== null; ) {
                if (j.key === de) {
                  if (((de = O.type), de === B)) {
                    if (j.tag === 7) {
                      (a(R, j.sibling),
                        (L = i(j, O.props.children)),
                        (L.return = R),
                        (R = L));
                      break e;
                    }
                  } else if (
                    j.elementType === de ||
                    (typeof de == 'object' &&
                      de !== null &&
                      de.$$typeof === Z &&
                      vn(de) === j.type)
                  ) {
                    (a(R, j.sibling),
                      (L = i(j, O.props)),
                      Ll(L, O),
                      (L.return = R),
                      (R = L));
                    break e;
                  }
                  a(R, j);
                  break;
                } else t(R, j);
                j = j.sibling;
              }
              O.type === B
                ? ((L = mn(O.props.children, R.mode, L, O.key)),
                  (L.return = R),
                  (R = L))
                : ((L = Yi(O.type, O.key, O.props, null, R.mode, L)),
                  Ll(L, O),
                  (L.return = R),
                  (R = L));
            }
            return o(R);
          case G:
            e: {
              for (de = O.key; j !== null; ) {
                if (j.key === de)
                  if (
                    j.tag === 4 &&
                    j.stateNode.containerInfo === O.containerInfo &&
                    j.stateNode.implementation === O.implementation
                  ) {
                    (a(R, j.sibling),
                      (L = i(j, O.children || [])),
                      (L.return = R),
                      (R = L));
                    break e;
                  } else {
                    a(R, j);
                    break;
                  }
                else t(R, j);
                j = j.sibling;
              }
              ((L = Br(O, R.mode, L)), (L.return = R), (R = L));
            }
            return o(R);
          case Z:
            return ((O = vn(O)), He(R, j, O, L));
        }
        if (ae(O)) return ie(R, j, O, L);
        if (Ee(O)) {
          if (((de = Ee(O)), typeof de != 'function')) throw Error(c(150));
          return ((O = de.call(O)), me(R, j, O, L));
        }
        if (typeof O.then == 'function') return He(R, j, Ji(O), L);
        if (O.$$typeof === F) return He(R, j, Zi(R, O), L);
        $i(R, O);
      }
      return (typeof O == 'string' && O !== '') ||
        typeof O == 'number' ||
        typeof O == 'bigint'
        ? ((O = '' + O),
          j !== null && j.tag === 6
            ? (a(R, j.sibling), (L = i(j, O)), (L.return = R), (R = L))
            : (a(R, j), (L = Hr(O, R.mode, L)), (L.return = R), (R = L)),
          o(R))
        : a(R, j);
    }
    return function (R, j, O, L) {
      try {
        ql = 0;
        var de = He(R, j, O, L);
        return ((el = null), de);
      } catch (oe) {
        if (oe === Pn || oe === Vi) throw oe;
        var ze = Rt(29, oe, null, R.mode);
        return ((ze.lanes = L), (ze.return = R), ze);
      } finally {
      }
    };
  }
  var Sn = vf(!0),
    xf = vf(!1),
    ka = !1;
  function Wr(e) {
    e.updateQueue = {
      baseState: e.memoizedState,
      firstBaseUpdate: null,
      lastBaseUpdate: null,
      shared: { pending: null, lanes: 0, hiddenCallbacks: null },
      callbacks: null,
    };
  }
  function Fr(e, t) {
    ((e = e.updateQueue),
      t.updateQueue === e &&
        (t.updateQueue = {
          baseState: e.baseState,
          firstBaseUpdate: e.firstBaseUpdate,
          lastBaseUpdate: e.lastBaseUpdate,
          shared: e.shared,
          callbacks: null,
        }));
  }
  function Ha(e) {
    return { lane: e, tag: 0, payload: null, callback: null, next: null };
  }
  function Ba(e, t, a) {
    var n = e.updateQueue;
    if (n === null) return null;
    if (((n = n.shared), (Oe & 2) !== 0)) {
      var i = n.pending;
      return (
        i === null ? (t.next = t) : ((t.next = i.next), (i.next = t)),
        (n.pending = t),
        (t = Li(e)),
        af(e, null, a),
        t
      );
    }
    return (qi(e, n, t, a), Li(e));
  }
  function Yl(e, t, a) {
    if (
      ((t = t.updateQueue), t !== null && ((t = t.shared), (a & 4194048) !== 0))
    ) {
      var n = t.lanes;
      ((n &= e.pendingLanes), (a |= n), (t.lanes = a), co(e, a));
    }
  }
  function Ir(e, t) {
    var a = e.updateQueue,
      n = e.alternate;
    if (n !== null && ((n = n.updateQueue), a === n)) {
      var i = null,
        s = null;
      if (((a = a.firstBaseUpdate), a !== null)) {
        do {
          var o = {
            lane: a.lane,
            tag: a.tag,
            payload: a.payload,
            callback: null,
            next: null,
          };
          (s === null ? (i = s = o) : (s = s.next = o), (a = a.next));
        } while (a !== null);
        s === null ? (i = s = t) : (s = s.next = t);
      } else i = s = t;
      ((a = {
        baseState: n.baseState,
        firstBaseUpdate: i,
        lastBaseUpdate: s,
        shared: n.shared,
        callbacks: n.callbacks,
      }),
        (e.updateQueue = a));
      return;
    }
    ((e = a.lastBaseUpdate),
      e === null ? (a.firstBaseUpdate = t) : (e.next = t),
      (a.lastBaseUpdate = t));
  }
  var Pr = !1;
  function Gl() {
    if (Pr) {
      var e = In;
      if (e !== null) throw e;
    }
  }
  function Xl(e, t, a, n) {
    Pr = !1;
    var i = e.updateQueue;
    ka = !1;
    var s = i.firstBaseUpdate,
      o = i.lastBaseUpdate,
      y = i.shared.pending;
    if (y !== null) {
      i.shared.pending = null;
      var T = y,
        C = T.next;
      ((T.next = null), o === null ? (s = C) : (o.next = C), (o = T));
      var H = e.alternate;
      H !== null &&
        ((H = H.updateQueue),
        (y = H.lastBaseUpdate),
        y !== o &&
          (y === null ? (H.firstBaseUpdate = C) : (y.next = C),
          (H.lastBaseUpdate = T)));
    }
    if (s !== null) {
      var X = i.baseState;
      ((o = 0), (H = C = T = null), (y = s));
      do {
        var M = y.lane & -536870913,
          U = M !== y.lane;
        if (U ? (we & M) === M : (n & M) === M) {
          (M !== 0 && M === Fn && (Pr = !0),
            H !== null &&
              (H = H.next =
                {
                  lane: 0,
                  tag: y.tag,
                  payload: y.payload,
                  callback: null,
                  next: null,
                }));
          e: {
            var ie = e,
              me = y;
            M = t;
            var He = a;
            switch (me.tag) {
              case 1:
                if (((ie = me.payload), typeof ie == 'function')) {
                  X = ie.call(He, X, M);
                  break e;
                }
                X = ie;
                break e;
              case 3:
                ie.flags = (ie.flags & -65537) | 128;
              case 0:
                if (
                  ((ie = me.payload),
                  (M = typeof ie == 'function' ? ie.call(He, X, M) : ie),
                  M == null)
                )
                  break e;
                X = b({}, X, M);
                break e;
              case 2:
                ka = !0;
            }
          }
          ((M = y.callback),
            M !== null &&
              ((e.flags |= 64),
              U && (e.flags |= 8192),
              (U = i.callbacks),
              U === null ? (i.callbacks = [M]) : U.push(M)));
        } else
          ((U = {
            lane: M,
            tag: y.tag,
            payload: y.payload,
            callback: y.callback,
            next: null,
          }),
            H === null ? ((C = H = U), (T = X)) : (H = H.next = U),
            (o |= M));
        if (((y = y.next), y === null)) {
          if (((y = i.shared.pending), y === null)) break;
          ((U = y),
            (y = U.next),
            (U.next = null),
            (i.lastBaseUpdate = U),
            (i.shared.pending = null));
        }
      } while (!0);
      (H === null && (T = X),
        (i.baseState = T),
        (i.firstBaseUpdate = C),
        (i.lastBaseUpdate = H),
        s === null && (i.shared.lanes = 0),
        (Xa |= o),
        (e.lanes = o),
        (e.memoizedState = X));
    }
  }
  function Sf(e, t) {
    if (typeof e != 'function') throw Error(c(191, e));
    e.call(t);
  }
  function Ef(e, t) {
    var a = e.callbacks;
    if (a !== null)
      for (e.callbacks = null, e = 0; e < a.length; e++) Sf(a[e], t);
  }
  var tl = w(null),
    Wi = w(0);
  function Tf(e, t) {
    ((e = Sa), A(Wi, e), A(tl, t), (Sa = e | t.baseLanes));
  }
  function eu() {
    (A(Wi, Sa), A(tl, tl.current));
  }
  function tu() {
    ((Sa = Wi.current), g(tl), g(Wi));
  }
  var zt = w(null),
    Gt = null;
  function qa(e) {
    var t = e.alternate;
    (A(We, We.current & 1),
      A(zt, e),
      Gt === null &&
        (t === null || tl.current !== null || t.memoizedState !== null) &&
        (Gt = e));
  }
  function au(e) {
    (A(We, We.current), A(zt, e), Gt === null && (Gt = e));
  }
  function Af(e) {
    e.tag === 22
      ? (A(We, We.current), A(zt, e), Gt === null && (Gt = e))
      : La();
  }
  function La() {
    (A(We, We.current), A(zt, zt.current));
  }
  function _t(e) {
    (g(zt), Gt === e && (Gt = null), g(We));
  }
  var We = w(0);
  function Fi(e) {
    for (var t = e; t !== null; ) {
      if (t.tag === 13) {
        var a = t.memoizedState;
        if (a !== null && ((a = a.dehydrated), a === null || uc(a) || cc(a)))
          return t;
      } else if (
        t.tag === 19 &&
        (t.memoizedProps.revealOrder === 'forwards' ||
          t.memoizedProps.revealOrder === 'backwards' ||
          t.memoizedProps.revealOrder === 'unstable_legacy-backwards' ||
          t.memoizedProps.revealOrder === 'together')
      ) {
        if ((t.flags & 128) !== 0) return t;
      } else if (t.child !== null) {
        ((t.child.return = t), (t = t.child));
        continue;
      }
      if (t === e) break;
      for (; t.sibling === null; ) {
        if (t.return === null || t.return === e) return null;
        t = t.return;
      }
      ((t.sibling.return = t.return), (t = t.sibling));
    }
    return null;
  }
  var ha = 0,
    be = null,
    Ue = null,
    Pe = null,
    Ii = !1,
    al = !1,
    En = !1,
    Pi = 0,
    Zl = 0,
    nl = null,
    yg = 0;
  function Je() {
    throw Error(c(321));
  }
  function nu(e, t) {
    if (t === null) return !1;
    for (var a = 0; a < t.length && a < e.length; a++)
      if (!Nt(e[a], t[a])) return !1;
    return !0;
  }
  function lu(e, t, a, n, i, s) {
    return (
      (ha = s),
      (be = t),
      (t.memoizedState = null),
      (t.updateQueue = null),
      (t.lanes = 0),
      (z.H = e === null || e.memoizedState === null ? rd : vu),
      (En = !1),
      (s = a(n, i)),
      (En = !1),
      al && (s = jf(t, a, n, i)),
      wf(e),
      s
    );
  }
  function wf(e) {
    z.H = Kl;
    var t = Ue !== null && Ue.next !== null;
    if (((ha = 0), (Pe = Ue = be = null), (Ii = !1), (Zl = 0), (nl = null), t))
      throw Error(c(300));
    e === null ||
      et ||
      ((e = e.dependencies), e !== null && Xi(e) && (et = !0));
  }
  function jf(e, t, a, n) {
    be = e;
    var i = 0;
    do {
      if ((al && (nl = null), (Zl = 0), (al = !1), 25 <= i))
        throw Error(c(301));
      if (((i += 1), (Pe = Ue = null), e.updateQueue != null)) {
        var s = e.updateQueue;
        ((s.lastEffect = null),
          (s.events = null),
          (s.stores = null),
          s.memoCache != null && (s.memoCache.index = 0));
      }
      ((z.H = ud), (s = t(a, n)));
    } while (al);
    return s;
  }
  function pg() {
    var e = z.H,
      t = e.useState()[0];
    return (
      (t = typeof t.then == 'function' ? Ql(t) : t),
      (e = e.useState()[0]),
      (Ue !== null ? Ue.memoizedState : null) !== e && (be.flags |= 1024),
      t
    );
  }
  function iu() {
    var e = Pi !== 0;
    return ((Pi = 0), e);
  }
  function su(e, t, a) {
    ((t.updateQueue = e.updateQueue), (t.flags &= -2053), (e.lanes &= ~a));
  }
  function ru(e) {
    if (Ii) {
      for (e = e.memoizedState; e !== null; ) {
        var t = e.queue;
        (t !== null && (t.pending = null), (e = e.next));
      }
      Ii = !1;
    }
    ((ha = 0), (Pe = Ue = be = null), (al = !1), (Zl = Pi = 0), (nl = null));
  }
  function pt() {
    var e = {
      memoizedState: null,
      baseState: null,
      baseQueue: null,
      queue: null,
      next: null,
    };
    return (Pe === null ? (be.memoizedState = Pe = e) : (Pe = Pe.next = e), Pe);
  }
  function Fe() {
    if (Ue === null) {
      var e = be.alternate;
      e = e !== null ? e.memoizedState : null;
    } else e = Ue.next;
    var t = Pe === null ? be.memoizedState : Pe.next;
    if (t !== null) ((Pe = t), (Ue = e));
    else {
      if (e === null)
        throw be.alternate === null ? Error(c(467)) : Error(c(310));
      ((Ue = e),
        (e = {
          memoizedState: Ue.memoizedState,
          baseState: Ue.baseState,
          baseQueue: Ue.baseQueue,
          queue: Ue.queue,
          next: null,
        }),
        Pe === null ? (be.memoizedState = Pe = e) : (Pe = Pe.next = e));
    }
    return Pe;
  }
  function es() {
    return { lastEffect: null, events: null, stores: null, memoCache: null };
  }
  function Ql(e) {
    var t = Zl;
    return (
      (Zl += 1),
      nl === null && (nl = []),
      (e = pf(nl, e, t)),
      (t = be),
      (Pe === null ? t.memoizedState : Pe.next) === null &&
        ((t = t.alternate),
        (z.H = t === null || t.memoizedState === null ? rd : vu)),
      e
    );
  }
  function ts(e) {
    if (e !== null && typeof e == 'object') {
      if (typeof e.then == 'function') return Ql(e);
      if (e.$$typeof === F) return ft(e);
    }
    throw Error(c(438, String(e)));
  }
  function uu(e) {
    var t = null,
      a = be.updateQueue;
    if ((a !== null && (t = a.memoCache), t == null)) {
      var n = be.alternate;
      n !== null &&
        ((n = n.updateQueue),
        n !== null &&
          ((n = n.memoCache),
          n != null &&
            (t = {
              data: n.data.map(function (i) {
                return i.slice();
              }),
              index: 0,
            })));
    }
    if (
      (t == null && (t = { data: [], index: 0 }),
      a === null && ((a = es()), (be.updateQueue = a)),
      (a.memoCache = t),
      (a = t.data[t.index]),
      a === void 0)
    )
      for (a = t.data[t.index] = Array(e), n = 0; n < e; n++) a[n] = Ye;
    return (t.index++, a);
  }
  function ma(e, t) {
    return typeof t == 'function' ? t(e) : t;
  }
  function as(e) {
    var t = Fe();
    return cu(t, Ue, e);
  }
  function cu(e, t, a) {
    var n = e.queue;
    if (n === null) throw Error(c(311));
    n.lastRenderedReducer = a;
    var i = e.baseQueue,
      s = n.pending;
    if (s !== null) {
      if (i !== null) {
        var o = i.next;
        ((i.next = s.next), (s.next = o));
      }
      ((t.baseQueue = i = s), (n.pending = null));
    }
    if (((s = e.baseState), i === null)) e.memoizedState = s;
    else {
      t = i.next;
      var y = (o = null),
        T = null,
        C = t,
        H = !1;
      do {
        var X = C.lane & -536870913;
        if (X !== C.lane ? (we & X) === X : (ha & X) === X) {
          var M = C.revertLane;
          if (M === 0)
            (T !== null &&
              (T = T.next =
                {
                  lane: 0,
                  revertLane: 0,
                  gesture: null,
                  action: C.action,
                  hasEagerState: C.hasEagerState,
                  eagerState: C.eagerState,
                  next: null,
                }),
              X === Fn && (H = !0));
          else if ((ha & M) === M) {
            ((C = C.next), M === Fn && (H = !0));
            continue;
          } else
            ((X = {
              lane: 0,
              revertLane: C.revertLane,
              gesture: null,
              action: C.action,
              hasEagerState: C.hasEagerState,
              eagerState: C.eagerState,
              next: null,
            }),
              T === null ? ((y = T = X), (o = s)) : (T = T.next = X),
              (be.lanes |= M),
              (Xa |= M));
          ((X = C.action),
            En && a(s, X),
            (s = C.hasEagerState ? C.eagerState : a(s, X)));
        } else
          ((M = {
            lane: X,
            revertLane: C.revertLane,
            gesture: C.gesture,
            action: C.action,
            hasEagerState: C.hasEagerState,
            eagerState: C.eagerState,
            next: null,
          }),
            T === null ? ((y = T = M), (o = s)) : (T = T.next = M),
            (be.lanes |= X),
            (Xa |= X));
        C = C.next;
      } while (C !== null && C !== t);
      if (
        (T === null ? (o = s) : (T.next = y),
        !Nt(s, e.memoizedState) && ((et = !0), H && ((a = In), a !== null)))
      )
        throw a;
      ((e.memoizedState = s),
        (e.baseState = o),
        (e.baseQueue = T),
        (n.lastRenderedState = s));
    }
    return (i === null && (n.lanes = 0), [e.memoizedState, n.dispatch]);
  }
  function ou(e) {
    var t = Fe(),
      a = t.queue;
    if (a === null) throw Error(c(311));
    a.lastRenderedReducer = e;
    var n = a.dispatch,
      i = a.pending,
      s = t.memoizedState;
    if (i !== null) {
      a.pending = null;
      var o = (i = i.next);
      do ((s = e(s, o.action)), (o = o.next));
      while (o !== i);
      (Nt(s, t.memoizedState) || (et = !0),
        (t.memoizedState = s),
        t.baseQueue === null && (t.baseState = s),
        (a.lastRenderedState = s));
    }
    return [s, n];
  }
  function Nf(e, t, a) {
    var n = be,
      i = Fe(),
      s = Ne;
    if (s) {
      if (a === void 0) throw Error(c(407));
      a = a();
    } else a = t();
    var o = !Nt((Ue || i).memoizedState, a);
    if (
      (o && ((i.memoizedState = a), (et = !0)),
      (i = i.queue),
      hu(_f.bind(null, n, i, e), [e]),
      i.getSnapshot !== t || o || (Pe !== null && Pe.memoizedState.tag & 1))
    ) {
      if (
        ((n.flags |= 2048),
        ll(9, { destroy: void 0 }, zf.bind(null, n, i, a, t), null),
        qe === null)
      )
        throw Error(c(349));
      s || (ha & 127) !== 0 || Rf(n, t, a);
    }
    return a;
  }
  function Rf(e, t, a) {
    ((e.flags |= 16384),
      (e = { getSnapshot: t, value: a }),
      (t = be.updateQueue),
      t === null
        ? ((t = es()), (be.updateQueue = t), (t.stores = [e]))
        : ((a = t.stores), a === null ? (t.stores = [e]) : a.push(e)));
  }
  function zf(e, t, a, n) {
    ((t.value = a), (t.getSnapshot = n), Of(t) && Cf(e));
  }
  function _f(e, t, a) {
    return a(function () {
      Of(t) && Cf(e);
    });
  }
  function Of(e) {
    var t = e.getSnapshot;
    e = e.value;
    try {
      var a = t();
      return !Nt(e, a);
    } catch {
      return !0;
    }
  }
  function Cf(e) {
    var t = hn(e, 2);
    t !== null && Tt(t, e, 2);
  }
  function fu(e) {
    var t = pt();
    if (typeof e == 'function') {
      var a = e;
      if (((e = a()), En)) {
        za(!0);
        try {
          a();
        } finally {
          za(!1);
        }
      }
    }
    return (
      (t.memoizedState = t.baseState = e),
      (t.queue = {
        pending: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: ma,
        lastRenderedState: e,
      }),
      t
    );
  }
  function Mf(e, t, a, n) {
    return ((e.baseState = a), cu(e, Ue, typeof n == 'function' ? n : ma));
  }
  function gg(e, t, a, n, i) {
    if (is(e)) throw Error(c(485));
    if (((e = t.action), e !== null)) {
      var s = {
        payload: i,
        action: e,
        next: null,
        isTransition: !0,
        status: 'pending',
        value: null,
        reason: null,
        listeners: [],
        then: function (o) {
          s.listeners.push(o);
        },
      };
      (z.T !== null ? a(!0) : (s.isTransition = !1),
        n(s),
        (a = t.pending),
        a === null
          ? ((s.next = t.pending = s), Df(t, s))
          : ((s.next = a.next), (t.pending = a.next = s)));
    }
  }
  function Df(e, t) {
    var a = t.action,
      n = t.payload,
      i = e.state;
    if (t.isTransition) {
      var s = z.T,
        o = {};
      z.T = o;
      try {
        var y = a(i, n),
          T = z.S;
        (T !== null && T(o, y), Uf(e, t, y));
      } catch (C) {
        du(e, t, C);
      } finally {
        (s !== null && o.types !== null && (s.types = o.types), (z.T = s));
      }
    } else
      try {
        ((s = a(i, n)), Uf(e, t, s));
      } catch (C) {
        du(e, t, C);
      }
  }
  function Uf(e, t, a) {
    a !== null && typeof a == 'object' && typeof a.then == 'function'
      ? a.then(
          function (n) {
            kf(e, t, n);
          },
          function (n) {
            return du(e, t, n);
          },
        )
      : kf(e, t, a);
  }
  function kf(e, t, a) {
    ((t.status = 'fulfilled'),
      (t.value = a),
      Hf(t),
      (e.state = a),
      (t = e.pending),
      t !== null &&
        ((a = t.next),
        a === t ? (e.pending = null) : ((a = a.next), (t.next = a), Df(e, a))));
  }
  function du(e, t, a) {
    var n = e.pending;
    if (((e.pending = null), n !== null)) {
      n = n.next;
      do ((t.status = 'rejected'), (t.reason = a), Hf(t), (t = t.next));
      while (t !== n);
    }
    e.action = null;
  }
  function Hf(e) {
    e = e.listeners;
    for (var t = 0; t < e.length; t++) (0, e[t])();
  }
  function Bf(e, t) {
    return t;
  }
  function qf(e, t) {
    if (Ne) {
      var a = qe.formState;
      if (a !== null) {
        e: {
          var n = be;
          if (Ne) {
            if (Ge) {
              t: {
                for (var i = Ge, s = Yt; i.nodeType !== 8; ) {
                  if (!s) {
                    i = null;
                    break t;
                  }
                  if (((i = Xt(i.nextSibling)), i === null)) {
                    i = null;
                    break t;
                  }
                }
                ((s = i.data), (i = s === 'F!' || s === 'F' ? i : null));
              }
              if (i) {
                ((Ge = Xt(i.nextSibling)), (n = i.data === 'F!'));
                break e;
              }
            }
            Da(n);
          }
          n = !1;
        }
        n && (t = a[0]);
      }
    }
    return (
      (a = pt()),
      (a.memoizedState = a.baseState = t),
      (n = {
        pending: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: Bf,
        lastRenderedState: t,
      }),
      (a.queue = n),
      (a = ld.bind(null, be, n)),
      (n.dispatch = a),
      (n = fu(!1)),
      (s = bu.bind(null, be, !1, n.queue)),
      (n = pt()),
      (i = { state: t, dispatch: null, action: e, pending: null }),
      (n.queue = i),
      (a = gg.bind(null, be, i, s, a)),
      (i.dispatch = a),
      (n.memoizedState = e),
      [t, a, !1]
    );
  }
  function Lf(e) {
    var t = Fe();
    return Yf(t, Ue, e);
  }
  function Yf(e, t, a) {
    if (
      ((t = cu(e, t, Bf)[0]),
      (e = as(ma)[0]),
      typeof t == 'object' && t !== null && typeof t.then == 'function')
    )
      try {
        var n = Ql(t);
      } catch (o) {
        throw o === Pn ? Vi : o;
      }
    else n = t;
    t = Fe();
    var i = t.queue,
      s = i.dispatch;
    return (
      a !== t.memoizedState &&
        ((be.flags |= 2048),
        ll(9, { destroy: void 0 }, bg.bind(null, i, a), null)),
      [n, s, e]
    );
  }
  function bg(e, t) {
    e.action = t;
  }
  function Gf(e) {
    var t = Fe(),
      a = Ue;
    if (a !== null) return Yf(t, a, e);
    (Fe(), (t = t.memoizedState), (a = Fe()));
    var n = a.queue.dispatch;
    return ((a.memoizedState = e), [t, n, !1]);
  }
  function ll(e, t, a, n) {
    return (
      (e = { tag: e, create: a, deps: n, inst: t, next: null }),
      (t = be.updateQueue),
      t === null && ((t = es()), (be.updateQueue = t)),
      (a = t.lastEffect),
      a === null
        ? (t.lastEffect = e.next = e)
        : ((n = a.next), (a.next = e), (e.next = n), (t.lastEffect = e)),
      e
    );
  }
  function Xf() {
    return Fe().memoizedState;
  }
  function ns(e, t, a, n) {
    var i = pt();
    ((be.flags |= e),
      (i.memoizedState = ll(
        1 | t,
        { destroy: void 0 },
        a,
        n === void 0 ? null : n,
      )));
  }
  function ls(e, t, a, n) {
    var i = Fe();
    n = n === void 0 ? null : n;
    var s = i.memoizedState.inst;
    Ue !== null && n !== null && nu(n, Ue.memoizedState.deps)
      ? (i.memoizedState = ll(t, s, a, n))
      : ((be.flags |= e), (i.memoizedState = ll(1 | t, s, a, n)));
  }
  function Zf(e, t) {
    ns(8390656, 8, e, t);
  }
  function hu(e, t) {
    ls(2048, 8, e, t);
  }
  function vg(e) {
    be.flags |= 4;
    var t = be.updateQueue;
    if (t === null) ((t = es()), (be.updateQueue = t), (t.events = [e]));
    else {
      var a = t.events;
      a === null ? (t.events = [e]) : a.push(e);
    }
  }
  function Qf(e) {
    var t = Fe().memoizedState;
    return (
      vg({ ref: t, nextImpl: e }),
      function () {
        if ((Oe & 2) !== 0) throw Error(c(440));
        return t.impl.apply(void 0, arguments);
      }
    );
  }
  function Vf(e, t) {
    return ls(4, 2, e, t);
  }
  function Kf(e, t) {
    return ls(4, 4, e, t);
  }
  function Jf(e, t) {
    if (typeof t == 'function') {
      e = e();
      var a = t(e);
      return function () {
        typeof a == 'function' ? a() : t(null);
      };
    }
    if (t != null)
      return (
        (e = e()),
        (t.current = e),
        function () {
          t.current = null;
        }
      );
  }
  function $f(e, t, a) {
    ((a = a != null ? a.concat([e]) : null), ls(4, 4, Jf.bind(null, t, e), a));
  }
  function mu() {}
  function Wf(e, t) {
    var a = Fe();
    t = t === void 0 ? null : t;
    var n = a.memoizedState;
    return t !== null && nu(t, n[1]) ? n[0] : ((a.memoizedState = [e, t]), e);
  }
  function Ff(e, t) {
    var a = Fe();
    t = t === void 0 ? null : t;
    var n = a.memoizedState;
    if (t !== null && nu(t, n[1])) return n[0];
    if (((n = e()), En)) {
      za(!0);
      try {
        e();
      } finally {
        za(!1);
      }
    }
    return ((a.memoizedState = [n, t]), n);
  }
  function yu(e, t, a) {
    return a === void 0 || ((ha & 1073741824) !== 0 && (we & 261930) === 0)
      ? (e.memoizedState = t)
      : ((e.memoizedState = a), (e = Id()), (be.lanes |= e), (Xa |= e), a);
  }
  function If(e, t, a, n) {
    return Nt(a, t)
      ? a
      : tl.current !== null
        ? ((e = yu(e, a, n)), Nt(e, t) || (et = !0), e)
        : (ha & 42) === 0 || ((ha & 1073741824) !== 0 && (we & 261930) === 0)
          ? ((et = !0), (e.memoizedState = a))
          : ((e = Id()), (be.lanes |= e), (Xa |= e), t);
  }
  function Pf(e, t, a, n, i) {
    var s = q.p;
    q.p = s !== 0 && 8 > s ? s : 8;
    var o = z.T,
      y = {};
    ((z.T = y), bu(e, !1, t, a));
    try {
      var T = i(),
        C = z.S;
      if (
        (C !== null && C(y, T),
        T !== null && typeof T == 'object' && typeof T.then == 'function')
      ) {
        var H = mg(T, n);
        Vl(e, t, H, Mt(e));
      } else Vl(e, t, n, Mt(e));
    } catch (X) {
      Vl(e, t, { then: function () {}, status: 'rejected', reason: X }, Mt());
    } finally {
      ((q.p = s),
        o !== null && y.types !== null && (o.types = y.types),
        (z.T = o));
    }
  }
  function xg() {}
  function pu(e, t, a, n) {
    if (e.tag !== 5) throw Error(c(476));
    var i = ed(e).queue;
    Pf(
      e,
      i,
      t,
      le,
      a === null
        ? xg
        : function () {
            return (td(e), a(n));
          },
    );
  }
  function ed(e) {
    var t = e.memoizedState;
    if (t !== null) return t;
    t = {
      memoizedState: le,
      baseState: le,
      baseQueue: null,
      queue: {
        pending: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: ma,
        lastRenderedState: le,
      },
      next: null,
    };
    var a = {};
    return (
      (t.next = {
        memoizedState: a,
        baseState: a,
        baseQueue: null,
        queue: {
          pending: null,
          lanes: 0,
          dispatch: null,
          lastRenderedReducer: ma,
          lastRenderedState: a,
        },
        next: null,
      }),
      (e.memoizedState = t),
      (e = e.alternate),
      e !== null && (e.memoizedState = t),
      t
    );
  }
  function td(e) {
    var t = ed(e);
    (t.next === null && (t = e.alternate.memoizedState),
      Vl(e, t.next.queue, {}, Mt()));
  }
  function gu() {
    return ft(ci);
  }
  function ad() {
    return Fe().memoizedState;
  }
  function nd() {
    return Fe().memoizedState;
  }
  function Sg(e) {
    for (var t = e.return; t !== null; ) {
      switch (t.tag) {
        case 24:
        case 3:
          var a = Mt();
          e = Ha(a);
          var n = Ba(t, e, a);
          (n !== null && (Tt(n, t, a), Yl(n, t, a)),
            (t = { cache: Vr() }),
            (e.payload = t));
          return;
      }
      t = t.return;
    }
  }
  function Eg(e, t, a) {
    var n = Mt();
    ((a = {
      lane: n,
      revertLane: 0,
      gesture: null,
      action: a,
      hasEagerState: !1,
      eagerState: null,
      next: null,
    }),
      is(e)
        ? id(t, a)
        : ((a = Ur(e, t, a, n)), a !== null && (Tt(a, e, n), sd(a, t, n))));
  }
  function ld(e, t, a) {
    var n = Mt();
    Vl(e, t, a, n);
  }
  function Vl(e, t, a, n) {
    var i = {
      lane: n,
      revertLane: 0,
      gesture: null,
      action: a,
      hasEagerState: !1,
      eagerState: null,
      next: null,
    };
    if (is(e)) id(t, i);
    else {
      var s = e.alternate;
      if (
        e.lanes === 0 &&
        (s === null || s.lanes === 0) &&
        ((s = t.lastRenderedReducer), s !== null)
      )
        try {
          var o = t.lastRenderedState,
            y = s(o, a);
          if (((i.hasEagerState = !0), (i.eagerState = y), Nt(y, o)))
            return (qi(e, t, i, 0), qe === null && Bi(), !1);
        } catch {
        } finally {
        }
      if (((a = Ur(e, t, i, n)), a !== null))
        return (Tt(a, e, n), sd(a, t, n), !0);
    }
    return !1;
  }
  function bu(e, t, a, n) {
    if (
      ((n = {
        lane: 2,
        revertLane: Wu(),
        gesture: null,
        action: n,
        hasEagerState: !1,
        eagerState: null,
        next: null,
      }),
      is(e))
    ) {
      if (t) throw Error(c(479));
    } else ((t = Ur(e, a, n, 2)), t !== null && Tt(t, e, 2));
  }
  function is(e) {
    var t = e.alternate;
    return e === be || (t !== null && t === be);
  }
  function id(e, t) {
    al = Ii = !0;
    var a = e.pending;
    (a === null ? (t.next = t) : ((t.next = a.next), (a.next = t)),
      (e.pending = t));
  }
  function sd(e, t, a) {
    if ((a & 4194048) !== 0) {
      var n = t.lanes;
      ((n &= e.pendingLanes), (a |= n), (t.lanes = a), co(e, a));
    }
  }
  var Kl = {
    readContext: ft,
    use: ts,
    useCallback: Je,
    useContext: Je,
    useEffect: Je,
    useImperativeHandle: Je,
    useLayoutEffect: Je,
    useInsertionEffect: Je,
    useMemo: Je,
    useReducer: Je,
    useRef: Je,
    useState: Je,
    useDebugValue: Je,
    useDeferredValue: Je,
    useTransition: Je,
    useSyncExternalStore: Je,
    useId: Je,
    useHostTransitionStatus: Je,
    useFormState: Je,
    useActionState: Je,
    useOptimistic: Je,
    useMemoCache: Je,
    useCacheRefresh: Je,
  };
  Kl.useEffectEvent = Je;
  var rd = {
      readContext: ft,
      use: ts,
      useCallback: function (e, t) {
        return ((pt().memoizedState = [e, t === void 0 ? null : t]), e);
      },
      useContext: ft,
      useEffect: Zf,
      useImperativeHandle: function (e, t, a) {
        ((a = a != null ? a.concat([e]) : null),
          ns(4194308, 4, Jf.bind(null, t, e), a));
      },
      useLayoutEffect: function (e, t) {
        return ns(4194308, 4, e, t);
      },
      useInsertionEffect: function (e, t) {
        ns(4, 2, e, t);
      },
      useMemo: function (e, t) {
        var a = pt();
        t = t === void 0 ? null : t;
        var n = e();
        if (En) {
          za(!0);
          try {
            e();
          } finally {
            za(!1);
          }
        }
        return ((a.memoizedState = [n, t]), n);
      },
      useReducer: function (e, t, a) {
        var n = pt();
        if (a !== void 0) {
          var i = a(t);
          if (En) {
            za(!0);
            try {
              a(t);
            } finally {
              za(!1);
            }
          }
        } else i = t;
        return (
          (n.memoizedState = n.baseState = i),
          (e = {
            pending: null,
            lanes: 0,
            dispatch: null,
            lastRenderedReducer: e,
            lastRenderedState: i,
          }),
          (n.queue = e),
          (e = e.dispatch = Eg.bind(null, be, e)),
          [n.memoizedState, e]
        );
      },
      useRef: function (e) {
        var t = pt();
        return ((e = { current: e }), (t.memoizedState = e));
      },
      useState: function (e) {
        e = fu(e);
        var t = e.queue,
          a = ld.bind(null, be, t);
        return ((t.dispatch = a), [e.memoizedState, a]);
      },
      useDebugValue: mu,
      useDeferredValue: function (e, t) {
        var a = pt();
        return yu(a, e, t);
      },
      useTransition: function () {
        var e = fu(!1);
        return (
          (e = Pf.bind(null, be, e.queue, !0, !1)),
          (pt().memoizedState = e),
          [!1, e]
        );
      },
      useSyncExternalStore: function (e, t, a) {
        var n = be,
          i = pt();
        if (Ne) {
          if (a === void 0) throw Error(c(407));
          a = a();
        } else {
          if (((a = t()), qe === null)) throw Error(c(349));
          (we & 127) !== 0 || Rf(n, t, a);
        }
        i.memoizedState = a;
        var s = { value: a, getSnapshot: t };
        return (
          (i.queue = s),
          Zf(_f.bind(null, n, s, e), [e]),
          (n.flags |= 2048),
          ll(9, { destroy: void 0 }, zf.bind(null, n, s, a, t), null),
          a
        );
      },
      useId: function () {
        var e = pt(),
          t = qe.identifierPrefix;
        if (Ne) {
          var a = Ft,
            n = Wt;
          ((a = (n & ~(1 << (32 - jt(n) - 1))).toString(32) + a),
            (t = '_' + t + 'R_' + a),
            (a = Pi++),
            0 < a && (t += 'H' + a.toString(32)),
            (t += '_'));
        } else ((a = yg++), (t = '_' + t + 'r_' + a.toString(32) + '_'));
        return (e.memoizedState = t);
      },
      useHostTransitionStatus: gu,
      useFormState: qf,
      useActionState: qf,
      useOptimistic: function (e) {
        var t = pt();
        t.memoizedState = t.baseState = e;
        var a = {
          pending: null,
          lanes: 0,
          dispatch: null,
          lastRenderedReducer: null,
          lastRenderedState: null,
        };
        return (
          (t.queue = a),
          (t = bu.bind(null, be, !0, a)),
          (a.dispatch = t),
          [e, t]
        );
      },
      useMemoCache: uu,
      useCacheRefresh: function () {
        return (pt().memoizedState = Sg.bind(null, be));
      },
      useEffectEvent: function (e) {
        var t = pt(),
          a = { impl: e };
        return (
          (t.memoizedState = a),
          function () {
            if ((Oe & 2) !== 0) throw Error(c(440));
            return a.impl.apply(void 0, arguments);
          }
        );
      },
    },
    vu = {
      readContext: ft,
      use: ts,
      useCallback: Wf,
      useContext: ft,
      useEffect: hu,
      useImperativeHandle: $f,
      useInsertionEffect: Vf,
      useLayoutEffect: Kf,
      useMemo: Ff,
      useReducer: as,
      useRef: Xf,
      useState: function () {
        return as(ma);
      },
      useDebugValue: mu,
      useDeferredValue: function (e, t) {
        var a = Fe();
        return If(a, Ue.memoizedState, e, t);
      },
      useTransition: function () {
        var e = as(ma)[0],
          t = Fe().memoizedState;
        return [typeof e == 'boolean' ? e : Ql(e), t];
      },
      useSyncExternalStore: Nf,
      useId: ad,
      useHostTransitionStatus: gu,
      useFormState: Lf,
      useActionState: Lf,
      useOptimistic: function (e, t) {
        var a = Fe();
        return Mf(a, Ue, e, t);
      },
      useMemoCache: uu,
      useCacheRefresh: nd,
    };
  vu.useEffectEvent = Qf;
  var ud = {
    readContext: ft,
    use: ts,
    useCallback: Wf,
    useContext: ft,
    useEffect: hu,
    useImperativeHandle: $f,
    useInsertionEffect: Vf,
    useLayoutEffect: Kf,
    useMemo: Ff,
    useReducer: ou,
    useRef: Xf,
    useState: function () {
      return ou(ma);
    },
    useDebugValue: mu,
    useDeferredValue: function (e, t) {
      var a = Fe();
      return Ue === null ? yu(a, e, t) : If(a, Ue.memoizedState, e, t);
    },
    useTransition: function () {
      var e = ou(ma)[0],
        t = Fe().memoizedState;
      return [typeof e == 'boolean' ? e : Ql(e), t];
    },
    useSyncExternalStore: Nf,
    useId: ad,
    useHostTransitionStatus: gu,
    useFormState: Gf,
    useActionState: Gf,
    useOptimistic: function (e, t) {
      var a = Fe();
      return Ue !== null
        ? Mf(a, Ue, e, t)
        : ((a.baseState = e), [e, a.queue.dispatch]);
    },
    useMemoCache: uu,
    useCacheRefresh: nd,
  };
  ud.useEffectEvent = Qf;
  function xu(e, t, a, n) {
    ((t = e.memoizedState),
      (a = a(n, t)),
      (a = a == null ? t : b({}, t, a)),
      (e.memoizedState = a),
      e.lanes === 0 && (e.updateQueue.baseState = a));
  }
  var Su = {
    enqueueSetState: function (e, t, a) {
      e = e._reactInternals;
      var n = Mt(),
        i = Ha(n);
      ((i.payload = t),
        a != null && (i.callback = a),
        (t = Ba(e, i, n)),
        t !== null && (Tt(t, e, n), Yl(t, e, n)));
    },
    enqueueReplaceState: function (e, t, a) {
      e = e._reactInternals;
      var n = Mt(),
        i = Ha(n);
      ((i.tag = 1),
        (i.payload = t),
        a != null && (i.callback = a),
        (t = Ba(e, i, n)),
        t !== null && (Tt(t, e, n), Yl(t, e, n)));
    },
    enqueueForceUpdate: function (e, t) {
      e = e._reactInternals;
      var a = Mt(),
        n = Ha(a);
      ((n.tag = 2),
        t != null && (n.callback = t),
        (t = Ba(e, n, a)),
        t !== null && (Tt(t, e, a), Yl(t, e, a)));
    },
  };
  function cd(e, t, a, n, i, s, o) {
    return (
      (e = e.stateNode),
      typeof e.shouldComponentUpdate == 'function'
        ? e.shouldComponentUpdate(n, s, o)
        : t.prototype && t.prototype.isPureReactComponent
          ? !Ml(a, n) || !Ml(i, s)
          : !0
    );
  }
  function od(e, t, a, n) {
    ((e = t.state),
      typeof t.componentWillReceiveProps == 'function' &&
        t.componentWillReceiveProps(a, n),
      typeof t.UNSAFE_componentWillReceiveProps == 'function' &&
        t.UNSAFE_componentWillReceiveProps(a, n),
      t.state !== e && Su.enqueueReplaceState(t, t.state, null));
  }
  function Tn(e, t) {
    var a = t;
    if ('ref' in t) {
      a = {};
      for (var n in t) n !== 'ref' && (a[n] = t[n]);
    }
    if ((e = e.defaultProps)) {
      a === t && (a = b({}, a));
      for (var i in e) a[i] === void 0 && (a[i] = e[i]);
    }
    return a;
  }
  function fd(e) {
    Hi(e);
  }
  function dd(e) {
    console.error(e);
  }
  function hd(e) {
    Hi(e);
  }
  function ss(e, t) {
    try {
      var a = e.onUncaughtError;
      a(t.value, { componentStack: t.stack });
    } catch (n) {
      setTimeout(function () {
        throw n;
      });
    }
  }
  function md(e, t, a) {
    try {
      var n = e.onCaughtError;
      n(a.value, {
        componentStack: a.stack,
        errorBoundary: t.tag === 1 ? t.stateNode : null,
      });
    } catch (i) {
      setTimeout(function () {
        throw i;
      });
    }
  }
  function Eu(e, t, a) {
    return (
      (a = Ha(a)),
      (a.tag = 3),
      (a.payload = { element: null }),
      (a.callback = function () {
        ss(e, t);
      }),
      a
    );
  }
  function yd(e) {
    return ((e = Ha(e)), (e.tag = 3), e);
  }
  function pd(e, t, a, n) {
    var i = a.type.getDerivedStateFromError;
    if (typeof i == 'function') {
      var s = n.value;
      ((e.payload = function () {
        return i(s);
      }),
        (e.callback = function () {
          md(t, a, n);
        }));
    }
    var o = a.stateNode;
    o !== null &&
      typeof o.componentDidCatch == 'function' &&
      (e.callback = function () {
        (md(t, a, n),
          typeof i != 'function' &&
            (Za === null ? (Za = new Set([this])) : Za.add(this)));
        var y = n.stack;
        this.componentDidCatch(n.value, {
          componentStack: y !== null ? y : '',
        });
      });
  }
  function Tg(e, t, a, n, i) {
    if (
      ((a.flags |= 32768),
      n !== null && typeof n == 'object' && typeof n.then == 'function')
    ) {
      if (
        ((t = a.alternate),
        t !== null && Wn(t, a, i, !0),
        (a = zt.current),
        a !== null)
      ) {
        switch (a.tag) {
          case 31:
          case 13:
            return (
              Gt === null ? bs() : a.alternate === null && $e === 0 && ($e = 3),
              (a.flags &= -257),
              (a.flags |= 65536),
              (a.lanes = i),
              n === Ki
                ? (a.flags |= 16384)
                : ((t = a.updateQueue),
                  t === null ? (a.updateQueue = new Set([n])) : t.add(n),
                  Ku(e, n, i)),
              !1
            );
          case 22:
            return (
              (a.flags |= 65536),
              n === Ki
                ? (a.flags |= 16384)
                : ((t = a.updateQueue),
                  t === null
                    ? ((t = {
                        transitions: null,
                        markerInstances: null,
                        retryQueue: new Set([n]),
                      }),
                      (a.updateQueue = t))
                    : ((a = t.retryQueue),
                      a === null ? (t.retryQueue = new Set([n])) : a.add(n)),
                  Ku(e, n, i)),
              !1
            );
        }
        throw Error(c(435, a.tag));
      }
      return (Ku(e, n, i), bs(), !1);
    }
    if (Ne)
      return (
        (t = zt.current),
        t !== null
          ? ((t.flags & 65536) === 0 && (t.flags |= 256),
            (t.flags |= 65536),
            (t.lanes = i),
            n !== Yr && ((e = Error(c(422), { cause: n })), kl(Bt(e, a))))
          : (n !== Yr && ((t = Error(c(423), { cause: n })), kl(Bt(t, a))),
            (e = e.current.alternate),
            (e.flags |= 65536),
            (i &= -i),
            (e.lanes |= i),
            (n = Bt(n, a)),
            (i = Eu(e.stateNode, n, i)),
            Ir(e, i),
            $e !== 4 && ($e = 2)),
        !1
      );
    var s = Error(c(520), { cause: n });
    if (
      ((s = Bt(s, a)),
      ti === null ? (ti = [s]) : ti.push(s),
      $e !== 4 && ($e = 2),
      t === null)
    )
      return !0;
    ((n = Bt(n, a)), (a = t));
    do {
      switch (a.tag) {
        case 3:
          return (
            (a.flags |= 65536),
            (e = i & -i),
            (a.lanes |= e),
            (e = Eu(a.stateNode, n, e)),
            Ir(a, e),
            !1
          );
        case 1:
          if (
            ((t = a.type),
            (s = a.stateNode),
            (a.flags & 128) === 0 &&
              (typeof t.getDerivedStateFromError == 'function' ||
                (s !== null &&
                  typeof s.componentDidCatch == 'function' &&
                  (Za === null || !Za.has(s)))))
          )
            return (
              (a.flags |= 65536),
              (i &= -i),
              (a.lanes |= i),
              (i = yd(i)),
              pd(i, e, a, n),
              Ir(a, i),
              !1
            );
      }
      a = a.return;
    } while (a !== null);
    return !1;
  }
  var Tu = Error(c(461)),
    et = !1;
  function dt(e, t, a, n) {
    t.child = e === null ? xf(t, null, a, n) : Sn(t, e.child, a, n);
  }
  function gd(e, t, a, n, i) {
    a = a.render;
    var s = t.ref;
    if ('ref' in n) {
      var o = {};
      for (var y in n) y !== 'ref' && (o[y] = n[y]);
    } else o = n;
    return (
      gn(t),
      (n = lu(e, t, a, o, s, i)),
      (y = iu()),
      e !== null && !et
        ? (su(e, t, i), ya(e, t, i))
        : (Ne && y && qr(t), (t.flags |= 1), dt(e, t, n, i), t.child)
    );
  }
  function bd(e, t, a, n, i) {
    if (e === null) {
      var s = a.type;
      return typeof s == 'function' &&
        !kr(s) &&
        s.defaultProps === void 0 &&
        a.compare === null
        ? ((t.tag = 15), (t.type = s), vd(e, t, s, n, i))
        : ((e = Yi(a.type, null, n, t, t.mode, i)),
          (e.ref = t.ref),
          (e.return = t),
          (t.child = e));
    }
    if (((s = e.child), !Ou(e, i))) {
      var o = s.memoizedProps;
      if (
        ((a = a.compare), (a = a !== null ? a : Ml), a(o, n) && e.ref === t.ref)
      )
        return ya(e, t, i);
    }
    return (
      (t.flags |= 1),
      (e = ca(s, n)),
      (e.ref = t.ref),
      (e.return = t),
      (t.child = e)
    );
  }
  function vd(e, t, a, n, i) {
    if (e !== null) {
      var s = e.memoizedProps;
      if (Ml(s, n) && e.ref === t.ref)
        if (((et = !1), (t.pendingProps = n = s), Ou(e, i)))
          (e.flags & 131072) !== 0 && (et = !0);
        else return ((t.lanes = e.lanes), ya(e, t, i));
    }
    return Au(e, t, a, n, i);
  }
  function xd(e, t, a, n) {
    var i = n.children,
      s = e !== null ? e.memoizedState : null;
    if (
      (e === null &&
        t.stateNode === null &&
        (t.stateNode = {
          _visibility: 1,
          _pendingMarkers: null,
          _retryCache: null,
          _transitions: null,
        }),
      n.mode === 'hidden')
    ) {
      if ((t.flags & 128) !== 0) {
        if (((s = s !== null ? s.baseLanes | a : a), e !== null)) {
          for (n = t.child = e.child, i = 0; n !== null; )
            ((i = i | n.lanes | n.childLanes), (n = n.sibling));
          n = i & ~s;
        } else ((n = 0), (t.child = null));
        return Sd(e, t, s, a, n);
      }
      if ((a & 536870912) !== 0)
        ((t.memoizedState = { baseLanes: 0, cachePool: null }),
          e !== null && Qi(t, s !== null ? s.cachePool : null),
          s !== null ? Tf(t, s) : eu(),
          Af(t));
      else
        return (
          (n = t.lanes = 536870912),
          Sd(e, t, s !== null ? s.baseLanes | a : a, a, n)
        );
    } else
      s !== null
        ? (Qi(t, s.cachePool), Tf(t, s), La(), (t.memoizedState = null))
        : (e !== null && Qi(t, null), eu(), La());
    return (dt(e, t, i, a), t.child);
  }
  function Jl(e, t) {
    return (
      (e !== null && e.tag === 22) ||
        t.stateNode !== null ||
        (t.stateNode = {
          _visibility: 1,
          _pendingMarkers: null,
          _retryCache: null,
          _transitions: null,
        }),
      t.sibling
    );
  }
  function Sd(e, t, a, n, i) {
    var s = Jr();
    return (
      (s = s === null ? null : { parent: Ie._currentValue, pool: s }),
      (t.memoizedState = { baseLanes: a, cachePool: s }),
      e !== null && Qi(t, null),
      eu(),
      Af(t),
      e !== null && Wn(e, t, n, !0),
      (t.childLanes = i),
      null
    );
  }
  function rs(e, t) {
    return (
      (t = cs({ mode: t.mode, children: t.children }, e.mode)),
      (t.ref = e.ref),
      (e.child = t),
      (t.return = e),
      t
    );
  }
  function Ed(e, t, a) {
    return (
      Sn(t, e.child, null, a),
      (e = rs(t, t.pendingProps)),
      (e.flags |= 2),
      _t(t),
      (t.memoizedState = null),
      e
    );
  }
  function Ag(e, t, a) {
    var n = t.pendingProps,
      i = (t.flags & 128) !== 0;
    if (((t.flags &= -129), e === null)) {
      if (Ne) {
        if (n.mode === 'hidden')
          return ((e = rs(t, n)), (t.lanes = 536870912), Jl(null, e));
        if (
          (au(t),
          (e = Ge)
            ? ((e = Dh(e, Yt)),
              (e = e !== null && e.data === '&' ? e : null),
              e !== null &&
                ((t.memoizedState = {
                  dehydrated: e,
                  treeContext: Ca !== null ? { id: Wt, overflow: Ft } : null,
                  retryLane: 536870912,
                  hydrationErrors: null,
                }),
                (a = lf(e)),
                (a.return = t),
                (t.child = a),
                (ot = t),
                (Ge = null)))
            : (e = null),
          e === null)
        )
          throw Da(t);
        return ((t.lanes = 536870912), null);
      }
      return rs(t, n);
    }
    var s = e.memoizedState;
    if (s !== null) {
      var o = s.dehydrated;
      if ((au(t), i))
        if (t.flags & 256) ((t.flags &= -257), (t = Ed(e, t, a)));
        else if (t.memoizedState !== null)
          ((t.child = e.child), (t.flags |= 128), (t = null));
        else throw Error(c(558));
      else if (
        (et || Wn(e, t, a, !1), (i = (a & e.childLanes) !== 0), et || i)
      ) {
        if (
          ((n = qe),
          n !== null && ((o = oo(n, a)), o !== 0 && o !== s.retryLane))
        )
          throw ((s.retryLane = o), hn(e, o), Tt(n, e, o), Tu);
        (bs(), (t = Ed(e, t, a)));
      } else
        ((e = s.treeContext),
          (Ge = Xt(o.nextSibling)),
          (ot = t),
          (Ne = !0),
          (Ma = null),
          (Yt = !1),
          e !== null && uf(t, e),
          (t = rs(t, n)),
          (t.flags |= 4096));
      return t;
    }
    return (
      (e = ca(e.child, { mode: n.mode, children: n.children })),
      (e.ref = t.ref),
      (t.child = e),
      (e.return = t),
      e
    );
  }
  function us(e, t) {
    var a = t.ref;
    if (a === null) e !== null && e.ref !== null && (t.flags |= 4194816);
    else {
      if (typeof a != 'function' && typeof a != 'object') throw Error(c(284));
      (e === null || e.ref !== a) && (t.flags |= 4194816);
    }
  }
  function Au(e, t, a, n, i) {
    return (
      gn(t),
      (a = lu(e, t, a, n, void 0, i)),
      (n = iu()),
      e !== null && !et
        ? (su(e, t, i), ya(e, t, i))
        : (Ne && n && qr(t), (t.flags |= 1), dt(e, t, a, i), t.child)
    );
  }
  function Td(e, t, a, n, i, s) {
    return (
      gn(t),
      (t.updateQueue = null),
      (a = jf(t, n, a, i)),
      wf(e),
      (n = iu()),
      e !== null && !et
        ? (su(e, t, s), ya(e, t, s))
        : (Ne && n && qr(t), (t.flags |= 1), dt(e, t, a, s), t.child)
    );
  }
  function Ad(e, t, a, n, i) {
    if ((gn(t), t.stateNode === null)) {
      var s = Vn,
        o = a.contextType;
      (typeof o == 'object' && o !== null && (s = ft(o)),
        (s = new a(n, s)),
        (t.memoizedState =
          s.state !== null && s.state !== void 0 ? s.state : null),
        (s.updater = Su),
        (t.stateNode = s),
        (s._reactInternals = t),
        (s = t.stateNode),
        (s.props = n),
        (s.state = t.memoizedState),
        (s.refs = {}),
        Wr(t),
        (o = a.contextType),
        (s.context = typeof o == 'object' && o !== null ? ft(o) : Vn),
        (s.state = t.memoizedState),
        (o = a.getDerivedStateFromProps),
        typeof o == 'function' && (xu(t, a, o, n), (s.state = t.memoizedState)),
        typeof a.getDerivedStateFromProps == 'function' ||
          typeof s.getSnapshotBeforeUpdate == 'function' ||
          (typeof s.UNSAFE_componentWillMount != 'function' &&
            typeof s.componentWillMount != 'function') ||
          ((o = s.state),
          typeof s.componentWillMount == 'function' && s.componentWillMount(),
          typeof s.UNSAFE_componentWillMount == 'function' &&
            s.UNSAFE_componentWillMount(),
          o !== s.state && Su.enqueueReplaceState(s, s.state, null),
          Xl(t, n, s, i),
          Gl(),
          (s.state = t.memoizedState)),
        typeof s.componentDidMount == 'function' && (t.flags |= 4194308),
        (n = !0));
    } else if (e === null) {
      s = t.stateNode;
      var y = t.memoizedProps,
        T = Tn(a, y);
      s.props = T;
      var C = s.context,
        H = a.contextType;
      ((o = Vn), typeof H == 'object' && H !== null && (o = ft(H)));
      var X = a.getDerivedStateFromProps;
      ((H =
        typeof X == 'function' ||
        typeof s.getSnapshotBeforeUpdate == 'function'),
        (y = t.pendingProps !== y),
        H ||
          (typeof s.UNSAFE_componentWillReceiveProps != 'function' &&
            typeof s.componentWillReceiveProps != 'function') ||
          ((y || C !== o) && od(t, s, n, o)),
        (ka = !1));
      var M = t.memoizedState;
      ((s.state = M),
        Xl(t, n, s, i),
        Gl(),
        (C = t.memoizedState),
        y || M !== C || ka
          ? (typeof X == 'function' && (xu(t, a, X, n), (C = t.memoizedState)),
            (T = ka || cd(t, a, T, n, M, C, o))
              ? (H ||
                  (typeof s.UNSAFE_componentWillMount != 'function' &&
                    typeof s.componentWillMount != 'function') ||
                  (typeof s.componentWillMount == 'function' &&
                    s.componentWillMount(),
                  typeof s.UNSAFE_componentWillMount == 'function' &&
                    s.UNSAFE_componentWillMount()),
                typeof s.componentDidMount == 'function' &&
                  (t.flags |= 4194308))
              : (typeof s.componentDidMount == 'function' &&
                  (t.flags |= 4194308),
                (t.memoizedProps = n),
                (t.memoizedState = C)),
            (s.props = n),
            (s.state = C),
            (s.context = o),
            (n = T))
          : (typeof s.componentDidMount == 'function' && (t.flags |= 4194308),
            (n = !1)));
    } else {
      ((s = t.stateNode),
        Fr(e, t),
        (o = t.memoizedProps),
        (H = Tn(a, o)),
        (s.props = H),
        (X = t.pendingProps),
        (M = s.context),
        (C = a.contextType),
        (T = Vn),
        typeof C == 'object' && C !== null && (T = ft(C)),
        (y = a.getDerivedStateFromProps),
        (C =
          typeof y == 'function' ||
          typeof s.getSnapshotBeforeUpdate == 'function') ||
          (typeof s.UNSAFE_componentWillReceiveProps != 'function' &&
            typeof s.componentWillReceiveProps != 'function') ||
          ((o !== X || M !== T) && od(t, s, n, T)),
        (ka = !1),
        (M = t.memoizedState),
        (s.state = M),
        Xl(t, n, s, i),
        Gl());
      var U = t.memoizedState;
      o !== X ||
      M !== U ||
      ka ||
      (e !== null && e.dependencies !== null && Xi(e.dependencies))
        ? (typeof y == 'function' && (xu(t, a, y, n), (U = t.memoizedState)),
          (H =
            ka ||
            cd(t, a, H, n, M, U, T) ||
            (e !== null && e.dependencies !== null && Xi(e.dependencies)))
            ? (C ||
                (typeof s.UNSAFE_componentWillUpdate != 'function' &&
                  typeof s.componentWillUpdate != 'function') ||
                (typeof s.componentWillUpdate == 'function' &&
                  s.componentWillUpdate(n, U, T),
                typeof s.UNSAFE_componentWillUpdate == 'function' &&
                  s.UNSAFE_componentWillUpdate(n, U, T)),
              typeof s.componentDidUpdate == 'function' && (t.flags |= 4),
              typeof s.getSnapshotBeforeUpdate == 'function' &&
                (t.flags |= 1024))
            : (typeof s.componentDidUpdate != 'function' ||
                (o === e.memoizedProps && M === e.memoizedState) ||
                (t.flags |= 4),
              typeof s.getSnapshotBeforeUpdate != 'function' ||
                (o === e.memoizedProps && M === e.memoizedState) ||
                (t.flags |= 1024),
              (t.memoizedProps = n),
              (t.memoizedState = U)),
          (s.props = n),
          (s.state = U),
          (s.context = T),
          (n = H))
        : (typeof s.componentDidUpdate != 'function' ||
            (o === e.memoizedProps && M === e.memoizedState) ||
            (t.flags |= 4),
          typeof s.getSnapshotBeforeUpdate != 'function' ||
            (o === e.memoizedProps && M === e.memoizedState) ||
            (t.flags |= 1024),
          (n = !1));
    }
    return (
      (s = n),
      us(e, t),
      (n = (t.flags & 128) !== 0),
      s || n
        ? ((s = t.stateNode),
          (a =
            n && typeof a.getDerivedStateFromError != 'function'
              ? null
              : s.render()),
          (t.flags |= 1),
          e !== null && n
            ? ((t.child = Sn(t, e.child, null, i)),
              (t.child = Sn(t, null, a, i)))
            : dt(e, t, a, i),
          (t.memoizedState = s.state),
          (e = t.child))
        : (e = ya(e, t, i)),
      e
    );
  }
  function wd(e, t, a, n) {
    return (yn(), (t.flags |= 256), dt(e, t, a, n), t.child);
  }
  var wu = {
    dehydrated: null,
    treeContext: null,
    retryLane: 0,
    hydrationErrors: null,
  };
  function ju(e) {
    return { baseLanes: e, cachePool: mf() };
  }
  function Nu(e, t, a) {
    return ((e = e !== null ? e.childLanes & ~a : 0), t && (e |= Ct), e);
  }
  function jd(e, t, a) {
    var n = t.pendingProps,
      i = !1,
      s = (t.flags & 128) !== 0,
      o;
    if (
      ((o = s) ||
        (o =
          e !== null && e.memoizedState === null ? !1 : (We.current & 2) !== 0),
      o && ((i = !0), (t.flags &= -129)),
      (o = (t.flags & 32) !== 0),
      (t.flags &= -33),
      e === null)
    ) {
      if (Ne) {
        if (
          (i ? qa(t) : La(),
          (e = Ge)
            ? ((e = Dh(e, Yt)),
              (e = e !== null && e.data !== '&' ? e : null),
              e !== null &&
                ((t.memoizedState = {
                  dehydrated: e,
                  treeContext: Ca !== null ? { id: Wt, overflow: Ft } : null,
                  retryLane: 536870912,
                  hydrationErrors: null,
                }),
                (a = lf(e)),
                (a.return = t),
                (t.child = a),
                (ot = t),
                (Ge = null)))
            : (e = null),
          e === null)
        )
          throw Da(t);
        return (cc(e) ? (t.lanes = 32) : (t.lanes = 536870912), null);
      }
      var y = n.children;
      return (
        (n = n.fallback),
        i
          ? (La(),
            (i = t.mode),
            (y = cs({ mode: 'hidden', children: y }, i)),
            (n = mn(n, i, a, null)),
            (y.return = t),
            (n.return = t),
            (y.sibling = n),
            (t.child = y),
            (n = t.child),
            (n.memoizedState = ju(a)),
            (n.childLanes = Nu(e, o, a)),
            (t.memoizedState = wu),
            Jl(null, n))
          : (qa(t), Ru(t, y))
      );
    }
    var T = e.memoizedState;
    if (T !== null && ((y = T.dehydrated), y !== null)) {
      if (s)
        t.flags & 256
          ? (qa(t), (t.flags &= -257), (t = zu(e, t, a)))
          : t.memoizedState !== null
            ? (La(), (t.child = e.child), (t.flags |= 128), (t = null))
            : (La(),
              (y = n.fallback),
              (i = t.mode),
              (n = cs({ mode: 'visible', children: n.children }, i)),
              (y = mn(y, i, a, null)),
              (y.flags |= 2),
              (n.return = t),
              (y.return = t),
              (n.sibling = y),
              (t.child = n),
              Sn(t, e.child, null, a),
              (n = t.child),
              (n.memoizedState = ju(a)),
              (n.childLanes = Nu(e, o, a)),
              (t.memoizedState = wu),
              (t = Jl(null, n)));
      else if ((qa(t), cc(y))) {
        if (((o = y.nextSibling && y.nextSibling.dataset), o)) var C = o.dgst;
        ((o = C),
          (n = Error(c(419))),
          (n.stack = ''),
          (n.digest = o),
          kl({ value: n, source: null, stack: null }),
          (t = zu(e, t, a)));
      } else if (
        (et || Wn(e, t, a, !1), (o = (a & e.childLanes) !== 0), et || o)
      ) {
        if (
          ((o = qe),
          o !== null && ((n = oo(o, a)), n !== 0 && n !== T.retryLane))
        )
          throw ((T.retryLane = n), hn(e, n), Tt(o, e, n), Tu);
        (uc(y) || bs(), (t = zu(e, t, a)));
      } else
        uc(y)
          ? ((t.flags |= 192), (t.child = e.child), (t = null))
          : ((e = T.treeContext),
            (Ge = Xt(y.nextSibling)),
            (ot = t),
            (Ne = !0),
            (Ma = null),
            (Yt = !1),
            e !== null && uf(t, e),
            (t = Ru(t, n.children)),
            (t.flags |= 4096));
      return t;
    }
    return i
      ? (La(),
        (y = n.fallback),
        (i = t.mode),
        (T = e.child),
        (C = T.sibling),
        (n = ca(T, { mode: 'hidden', children: n.children })),
        (n.subtreeFlags = T.subtreeFlags & 65011712),
        C !== null ? (y = ca(C, y)) : ((y = mn(y, i, a, null)), (y.flags |= 2)),
        (y.return = t),
        (n.return = t),
        (n.sibling = y),
        (t.child = n),
        Jl(null, n),
        (n = t.child),
        (y = e.child.memoizedState),
        y === null
          ? (y = ju(a))
          : ((i = y.cachePool),
            i !== null
              ? ((T = Ie._currentValue),
                (i = i.parent !== T ? { parent: T, pool: T } : i))
              : (i = mf()),
            (y = { baseLanes: y.baseLanes | a, cachePool: i })),
        (n.memoizedState = y),
        (n.childLanes = Nu(e, o, a)),
        (t.memoizedState = wu),
        Jl(e.child, n))
      : (qa(t),
        (a = e.child),
        (e = a.sibling),
        (a = ca(a, { mode: 'visible', children: n.children })),
        (a.return = t),
        (a.sibling = null),
        e !== null &&
          ((o = t.deletions),
          o === null ? ((t.deletions = [e]), (t.flags |= 16)) : o.push(e)),
        (t.child = a),
        (t.memoizedState = null),
        a);
  }
  function Ru(e, t) {
    return (
      (t = cs({ mode: 'visible', children: t }, e.mode)),
      (t.return = e),
      (e.child = t)
    );
  }
  function cs(e, t) {
    return ((e = Rt(22, e, null, t)), (e.lanes = 0), e);
  }
  function zu(e, t, a) {
    return (
      Sn(t, e.child, null, a),
      (e = Ru(t, t.pendingProps.children)),
      (e.flags |= 2),
      (t.memoizedState = null),
      e
    );
  }
  function Nd(e, t, a) {
    e.lanes |= t;
    var n = e.alternate;
    (n !== null && (n.lanes |= t), Zr(e.return, t, a));
  }
  function _u(e, t, a, n, i, s) {
    var o = e.memoizedState;
    o === null
      ? (e.memoizedState = {
          isBackwards: t,
          rendering: null,
          renderingStartTime: 0,
          last: n,
          tail: a,
          tailMode: i,
          treeForkCount: s,
        })
      : ((o.isBackwards = t),
        (o.rendering = null),
        (o.renderingStartTime = 0),
        (o.last = n),
        (o.tail = a),
        (o.tailMode = i),
        (o.treeForkCount = s));
  }
  function Rd(e, t, a) {
    var n = t.pendingProps,
      i = n.revealOrder,
      s = n.tail;
    n = n.children;
    var o = We.current,
      y = (o & 2) !== 0;
    if (
      (y ? ((o = (o & 1) | 2), (t.flags |= 128)) : (o &= 1),
      A(We, o),
      dt(e, t, n, a),
      (n = Ne ? Ul : 0),
      !y && e !== null && (e.flags & 128) !== 0)
    )
      e: for (e = t.child; e !== null; ) {
        if (e.tag === 13) e.memoizedState !== null && Nd(e, a, t);
        else if (e.tag === 19) Nd(e, a, t);
        else if (e.child !== null) {
          ((e.child.return = e), (e = e.child));
          continue;
        }
        if (e === t) break e;
        for (; e.sibling === null; ) {
          if (e.return === null || e.return === t) break e;
          e = e.return;
        }
        ((e.sibling.return = e.return), (e = e.sibling));
      }
    switch (i) {
      case 'forwards':
        for (a = t.child, i = null; a !== null; )
          ((e = a.alternate),
            e !== null && Fi(e) === null && (i = a),
            (a = a.sibling));
        ((a = i),
          a === null
            ? ((i = t.child), (t.child = null))
            : ((i = a.sibling), (a.sibling = null)),
          _u(t, !1, i, a, s, n));
        break;
      case 'backwards':
      case 'unstable_legacy-backwards':
        for (a = null, i = t.child, t.child = null; i !== null; ) {
          if (((e = i.alternate), e !== null && Fi(e) === null)) {
            t.child = i;
            break;
          }
          ((e = i.sibling), (i.sibling = a), (a = i), (i = e));
        }
        _u(t, !0, a, null, s, n);
        break;
      case 'together':
        _u(t, !1, null, null, void 0, n);
        break;
      default:
        t.memoizedState = null;
    }
    return t.child;
  }
  function ya(e, t, a) {
    if (
      (e !== null && (t.dependencies = e.dependencies),
      (Xa |= t.lanes),
      (a & t.childLanes) === 0)
    )
      if (e !== null) {
        if ((Wn(e, t, a, !1), (a & t.childLanes) === 0)) return null;
      } else return null;
    if (e !== null && t.child !== e.child) throw Error(c(153));
    if (t.child !== null) {
      for (
        e = t.child, a = ca(e, e.pendingProps), t.child = a, a.return = t;
        e.sibling !== null;
      )
        ((e = e.sibling),
          (a = a.sibling = ca(e, e.pendingProps)),
          (a.return = t));
      a.sibling = null;
    }
    return t.child;
  }
  function Ou(e, t) {
    return (e.lanes & t) !== 0
      ? !0
      : ((e = e.dependencies), !!(e !== null && Xi(e)));
  }
  function wg(e, t, a) {
    switch (t.tag) {
      case 3:
        (fe(t, t.stateNode.containerInfo),
          Ua(t, Ie, e.memoizedState.cache),
          yn());
        break;
      case 27:
      case 5:
        ee(t);
        break;
      case 4:
        fe(t, t.stateNode.containerInfo);
        break;
      case 10:
        Ua(t, t.type, t.memoizedProps.value);
        break;
      case 31:
        if (t.memoizedState !== null) return ((t.flags |= 128), au(t), null);
        break;
      case 13:
        var n = t.memoizedState;
        if (n !== null)
          return n.dehydrated !== null
            ? (qa(t), (t.flags |= 128), null)
            : (a & t.child.childLanes) !== 0
              ? jd(e, t, a)
              : (qa(t), (e = ya(e, t, a)), e !== null ? e.sibling : null);
        qa(t);
        break;
      case 19:
        var i = (e.flags & 128) !== 0;
        if (
          ((n = (a & t.childLanes) !== 0),
          n || (Wn(e, t, a, !1), (n = (a & t.childLanes) !== 0)),
          i)
        ) {
          if (n) return Rd(e, t, a);
          t.flags |= 128;
        }
        if (
          ((i = t.memoizedState),
          i !== null &&
            ((i.rendering = null), (i.tail = null), (i.lastEffect = null)),
          A(We, We.current),
          n)
        )
          break;
        return null;
      case 22:
        return ((t.lanes = 0), xd(e, t, a, t.pendingProps));
      case 24:
        Ua(t, Ie, e.memoizedState.cache);
    }
    return ya(e, t, a);
  }
  function zd(e, t, a) {
    if (e !== null)
      if (e.memoizedProps !== t.pendingProps) et = !0;
      else {
        if (!Ou(e, a) && (t.flags & 128) === 0) return ((et = !1), wg(e, t, a));
        et = (e.flags & 131072) !== 0;
      }
    else ((et = !1), Ne && (t.flags & 1048576) !== 0 && rf(t, Ul, t.index));
    switch (((t.lanes = 0), t.tag)) {
      case 16:
        e: {
          var n = t.pendingProps;
          if (((e = vn(t.elementType)), (t.type = e), typeof e == 'function'))
            kr(e)
              ? ((n = Tn(e, n)), (t.tag = 1), (t = Ad(null, t, e, n, a)))
              : ((t.tag = 0), (t = Au(null, t, e, n, a)));
          else {
            if (e != null) {
              var i = e.$$typeof;
              if (i === I) {
                ((t.tag = 11), (t = gd(null, t, e, n, a)));
                break e;
              } else if (i === J) {
                ((t.tag = 14), (t = bd(null, t, e, n, a)));
                break e;
              }
            }
            throw ((t = Be(e) || e), Error(c(306, t, '')));
          }
        }
        return t;
      case 0:
        return Au(e, t, t.type, t.pendingProps, a);
      case 1:
        return ((n = t.type), (i = Tn(n, t.pendingProps)), Ad(e, t, n, i, a));
      case 3:
        e: {
          if ((fe(t, t.stateNode.containerInfo), e === null))
            throw Error(c(387));
          n = t.pendingProps;
          var s = t.memoizedState;
          ((i = s.element), Fr(e, t), Xl(t, n, null, a));
          var o = t.memoizedState;
          if (
            ((n = o.cache),
            Ua(t, Ie, n),
            n !== s.cache && Qr(t, [Ie], a, !0),
            Gl(),
            (n = o.element),
            s.isDehydrated)
          )
            if (
              ((s = { element: n, isDehydrated: !1, cache: o.cache }),
              (t.updateQueue.baseState = s),
              (t.memoizedState = s),
              t.flags & 256)
            ) {
              t = wd(e, t, n, a);
              break e;
            } else if (n !== i) {
              ((i = Bt(Error(c(424)), t)), kl(i), (t = wd(e, t, n, a)));
              break e;
            } else {
              switch (((e = t.stateNode.containerInfo), e.nodeType)) {
                case 9:
                  e = e.body;
                  break;
                default:
                  e = e.nodeName === 'HTML' ? e.ownerDocument.body : e;
              }
              for (
                Ge = Xt(e.firstChild),
                  ot = t,
                  Ne = !0,
                  Ma = null,
                  Yt = !0,
                  a = xf(t, null, n, a),
                  t.child = a;
                a;
              )
                ((a.flags = (a.flags & -3) | 4096), (a = a.sibling));
            }
          else {
            if ((yn(), n === i)) {
              t = ya(e, t, a);
              break e;
            }
            dt(e, t, n, a);
          }
          t = t.child;
        }
        return t;
      case 26:
        return (
          us(e, t),
          e === null
            ? (a = Lh(t.type, null, t.pendingProps, null))
              ? (t.memoizedState = a)
              : Ne ||
                ((a = t.type),
                (e = t.pendingProps),
                (n = ws(K.current).createElement(a)),
                (n[ct] = t),
                (n[gt] = e),
                ht(n, a, e),
                st(n),
                (t.stateNode = n))
            : (t.memoizedState = Lh(
                t.type,
                e.memoizedProps,
                t.pendingProps,
                e.memoizedState,
              )),
          null
        );
      case 27:
        return (
          ee(t),
          e === null &&
            Ne &&
            ((n = t.stateNode = Hh(t.type, t.pendingProps, K.current)),
            (ot = t),
            (Yt = !0),
            (i = Ge),
            Ja(t.type) ? ((oc = i), (Ge = Xt(n.firstChild))) : (Ge = i)),
          dt(e, t, t.pendingProps.children, a),
          us(e, t),
          e === null && (t.flags |= 4194304),
          t.child
        );
      case 5:
        return (
          e === null &&
            Ne &&
            ((i = n = Ge) &&
              ((n = tb(n, t.type, t.pendingProps, Yt)),
              n !== null
                ? ((t.stateNode = n),
                  (ot = t),
                  (Ge = Xt(n.firstChild)),
                  (Yt = !1),
                  (i = !0))
                : (i = !1)),
            i || Da(t)),
          ee(t),
          (i = t.type),
          (s = t.pendingProps),
          (o = e !== null ? e.memoizedProps : null),
          (n = s.children),
          ic(i, s) ? (n = null) : o !== null && ic(i, o) && (t.flags |= 32),
          t.memoizedState !== null &&
            ((i = lu(e, t, pg, null, null, a)), (ci._currentValue = i)),
          us(e, t),
          dt(e, t, n, a),
          t.child
        );
      case 6:
        return (
          e === null &&
            Ne &&
            ((e = a = Ge) &&
              ((a = ab(a, t.pendingProps, Yt)),
              a !== null
                ? ((t.stateNode = a), (ot = t), (Ge = null), (e = !0))
                : (e = !1)),
            e || Da(t)),
          null
        );
      case 13:
        return jd(e, t, a);
      case 4:
        return (
          fe(t, t.stateNode.containerInfo),
          (n = t.pendingProps),
          e === null ? (t.child = Sn(t, null, n, a)) : dt(e, t, n, a),
          t.child
        );
      case 11:
        return gd(e, t, t.type, t.pendingProps, a);
      case 7:
        return (dt(e, t, t.pendingProps, a), t.child);
      case 8:
        return (dt(e, t, t.pendingProps.children, a), t.child);
      case 12:
        return (dt(e, t, t.pendingProps.children, a), t.child);
      case 10:
        return (
          (n = t.pendingProps),
          Ua(t, t.type, n.value),
          dt(e, t, n.children, a),
          t.child
        );
      case 9:
        return (
          (i = t.type._context),
          (n = t.pendingProps.children),
          gn(t),
          (i = ft(i)),
          (n = n(i)),
          (t.flags |= 1),
          dt(e, t, n, a),
          t.child
        );
      case 14:
        return bd(e, t, t.type, t.pendingProps, a);
      case 15:
        return vd(e, t, t.type, t.pendingProps, a);
      case 19:
        return Rd(e, t, a);
      case 31:
        return Ag(e, t, a);
      case 22:
        return xd(e, t, a, t.pendingProps);
      case 24:
        return (
          gn(t),
          (n = ft(Ie)),
          e === null
            ? ((i = Jr()),
              i === null &&
                ((i = qe),
                (s = Vr()),
                (i.pooledCache = s),
                s.refCount++,
                s !== null && (i.pooledCacheLanes |= a),
                (i = s)),
              (t.memoizedState = { parent: n, cache: i }),
              Wr(t),
              Ua(t, Ie, i))
            : ((e.lanes & a) !== 0 && (Fr(e, t), Xl(t, null, null, a), Gl()),
              (i = e.memoizedState),
              (s = t.memoizedState),
              i.parent !== n
                ? ((i = { parent: n, cache: n }),
                  (t.memoizedState = i),
                  t.lanes === 0 &&
                    (t.memoizedState = t.updateQueue.baseState = i),
                  Ua(t, Ie, n))
                : ((n = s.cache),
                  Ua(t, Ie, n),
                  n !== i.cache && Qr(t, [Ie], a, !0))),
          dt(e, t, t.pendingProps.children, a),
          t.child
        );
      case 29:
        throw t.pendingProps;
    }
    throw Error(c(156, t.tag));
  }
  function pa(e) {
    e.flags |= 4;
  }
  function Cu(e, t, a, n, i) {
    if (((t = (e.mode & 32) !== 0) && (t = !1), t)) {
      if (((e.flags |= 16777216), (i & 335544128) === i))
        if (e.stateNode.complete) e.flags |= 8192;
        else if (ah()) e.flags |= 8192;
        else throw ((xn = Ki), $r);
    } else e.flags &= -16777217;
  }
  function _d(e, t) {
    if (t.type !== 'stylesheet' || (t.state.loading & 4) !== 0)
      e.flags &= -16777217;
    else if (((e.flags |= 16777216), !Qh(t)))
      if (ah()) e.flags |= 8192;
      else throw ((xn = Ki), $r);
  }
  function os(e, t) {
    (t !== null && (e.flags |= 4),
      e.flags & 16384 &&
        ((t = e.tag !== 22 ? ro() : 536870912), (e.lanes |= t), (ul |= t)));
  }
  function $l(e, t) {
    if (!Ne)
      switch (e.tailMode) {
        case 'hidden':
          t = e.tail;
          for (var a = null; t !== null; )
            (t.alternate !== null && (a = t), (t = t.sibling));
          a === null ? (e.tail = null) : (a.sibling = null);
          break;
        case 'collapsed':
          a = e.tail;
          for (var n = null; a !== null; )
            (a.alternate !== null && (n = a), (a = a.sibling));
          n === null
            ? t || e.tail === null
              ? (e.tail = null)
              : (e.tail.sibling = null)
            : (n.sibling = null);
      }
  }
  function Xe(e) {
    var t = e.alternate !== null && e.alternate.child === e.child,
      a = 0,
      n = 0;
    if (t)
      for (var i = e.child; i !== null; )
        ((a |= i.lanes | i.childLanes),
          (n |= i.subtreeFlags & 65011712),
          (n |= i.flags & 65011712),
          (i.return = e),
          (i = i.sibling));
    else
      for (i = e.child; i !== null; )
        ((a |= i.lanes | i.childLanes),
          (n |= i.subtreeFlags),
          (n |= i.flags),
          (i.return = e),
          (i = i.sibling));
    return ((e.subtreeFlags |= n), (e.childLanes = a), t);
  }
  function jg(e, t, a) {
    var n = t.pendingProps;
    switch ((Lr(t), t.tag)) {
      case 16:
      case 15:
      case 0:
      case 11:
      case 7:
      case 8:
      case 12:
      case 9:
      case 14:
        return (Xe(t), null);
      case 1:
        return (Xe(t), null);
      case 3:
        return (
          (a = t.stateNode),
          (n = null),
          e !== null && (n = e.memoizedState.cache),
          t.memoizedState.cache !== n && (t.flags |= 2048),
          da(Ie),
          Y(),
          a.pendingContext &&
            ((a.context = a.pendingContext), (a.pendingContext = null)),
          (e === null || e.child === null) &&
            ($n(t)
              ? pa(t)
              : e === null ||
                (e.memoizedState.isDehydrated && (t.flags & 256) === 0) ||
                ((t.flags |= 1024), Gr())),
          Xe(t),
          null
        );
      case 26:
        var i = t.type,
          s = t.memoizedState;
        return (
          e === null
            ? (pa(t),
              s !== null ? (Xe(t), _d(t, s)) : (Xe(t), Cu(t, i, null, n, a)))
            : s
              ? s !== e.memoizedState
                ? (pa(t), Xe(t), _d(t, s))
                : (Xe(t), (t.flags &= -16777217))
              : ((e = e.memoizedProps),
                e !== n && pa(t),
                Xe(t),
                Cu(t, i, e, n, a)),
          null
        );
      case 27:
        if (
          (xe(t),
          (a = K.current),
          (i = t.type),
          e !== null && t.stateNode != null)
        )
          e.memoizedProps !== n && pa(t);
        else {
          if (!n) {
            if (t.stateNode === null) throw Error(c(166));
            return (Xe(t), null);
          }
          ((e = N.current),
            $n(t) ? cf(t) : ((e = Hh(i, n, a)), (t.stateNode = e), pa(t)));
        }
        return (Xe(t), null);
      case 5:
        if ((xe(t), (i = t.type), e !== null && t.stateNode != null))
          e.memoizedProps !== n && pa(t);
        else {
          if (!n) {
            if (t.stateNode === null) throw Error(c(166));
            return (Xe(t), null);
          }
          if (((s = N.current), $n(t))) cf(t);
          else {
            var o = ws(K.current);
            switch (s) {
              case 1:
                s = o.createElementNS('http://www.w3.org/2000/svg', i);
                break;
              case 2:
                s = o.createElementNS('http://www.w3.org/1998/Math/MathML', i);
                break;
              default:
                switch (i) {
                  case 'svg':
                    s = o.createElementNS('http://www.w3.org/2000/svg', i);
                    break;
                  case 'math':
                    s = o.createElementNS(
                      'http://www.w3.org/1998/Math/MathML',
                      i,
                    );
                    break;
                  case 'script':
                    ((s = o.createElement('div')),
                      (s.innerHTML = '<script><\/script>'),
                      (s = s.removeChild(s.firstChild)));
                    break;
                  case 'select':
                    ((s =
                      typeof n.is == 'string'
                        ? o.createElement('select', { is: n.is })
                        : o.createElement('select')),
                      n.multiple
                        ? (s.multiple = !0)
                        : n.size && (s.size = n.size));
                    break;
                  default:
                    s =
                      typeof n.is == 'string'
                        ? o.createElement(i, { is: n.is })
                        : o.createElement(i);
                }
            }
            ((s[ct] = t), (s[gt] = n));
            e: for (o = t.child; o !== null; ) {
              if (o.tag === 5 || o.tag === 6) s.appendChild(o.stateNode);
              else if (o.tag !== 4 && o.tag !== 27 && o.child !== null) {
                ((o.child.return = o), (o = o.child));
                continue;
              }
              if (o === t) break e;
              for (; o.sibling === null; ) {
                if (o.return === null || o.return === t) break e;
                o = o.return;
              }
              ((o.sibling.return = o.return), (o = o.sibling));
            }
            t.stateNode = s;
            e: switch ((ht(s, i, n), i)) {
              case 'button':
              case 'input':
              case 'select':
              case 'textarea':
                n = !!n.autoFocus;
                break e;
              case 'img':
                n = !0;
                break e;
              default:
                n = !1;
            }
            n && pa(t);
          }
        }
        return (
          Xe(t),
          Cu(t, t.type, e === null ? null : e.memoizedProps, t.pendingProps, a),
          null
        );
      case 6:
        if (e && t.stateNode != null) e.memoizedProps !== n && pa(t);
        else {
          if (typeof n != 'string' && t.stateNode === null) throw Error(c(166));
          if (((e = K.current), $n(t))) {
            if (
              ((e = t.stateNode),
              (a = t.memoizedProps),
              (n = null),
              (i = ot),
              i !== null)
            )
              switch (i.tag) {
                case 27:
                case 5:
                  n = i.memoizedProps;
              }
            ((e[ct] = t),
              (e = !!(
                e.nodeValue === a ||
                (n !== null && n.suppressHydrationWarning === !0) ||
                jh(e.nodeValue, a)
              )),
              e || Da(t, !0));
          } else
            ((e = ws(e).createTextNode(n)), (e[ct] = t), (t.stateNode = e));
        }
        return (Xe(t), null);
      case 31:
        if (((a = t.memoizedState), e === null || e.memoizedState !== null)) {
          if (((n = $n(t)), a !== null)) {
            if (e === null) {
              if (!n) throw Error(c(318));
              if (
                ((e = t.memoizedState),
                (e = e !== null ? e.dehydrated : null),
                !e)
              )
                throw Error(c(557));
              e[ct] = t;
            } else
              (yn(),
                (t.flags & 128) === 0 && (t.memoizedState = null),
                (t.flags |= 4));
            (Xe(t), (e = !1));
          } else
            ((a = Gr()),
              e !== null &&
                e.memoizedState !== null &&
                (e.memoizedState.hydrationErrors = a),
              (e = !0));
          if (!e) return t.flags & 256 ? (_t(t), t) : (_t(t), null);
          if ((t.flags & 128) !== 0) throw Error(c(558));
        }
        return (Xe(t), null);
      case 13:
        if (
          ((n = t.memoizedState),
          e === null ||
            (e.memoizedState !== null && e.memoizedState.dehydrated !== null))
        ) {
          if (((i = $n(t)), n !== null && n.dehydrated !== null)) {
            if (e === null) {
              if (!i) throw Error(c(318));
              if (
                ((i = t.memoizedState),
                (i = i !== null ? i.dehydrated : null),
                !i)
              )
                throw Error(c(317));
              i[ct] = t;
            } else
              (yn(),
                (t.flags & 128) === 0 && (t.memoizedState = null),
                (t.flags |= 4));
            (Xe(t), (i = !1));
          } else
            ((i = Gr()),
              e !== null &&
                e.memoizedState !== null &&
                (e.memoizedState.hydrationErrors = i),
              (i = !0));
          if (!i) return t.flags & 256 ? (_t(t), t) : (_t(t), null);
        }
        return (
          _t(t),
          (t.flags & 128) !== 0
            ? ((t.lanes = a), t)
            : ((a = n !== null),
              (e = e !== null && e.memoizedState !== null),
              a &&
                ((n = t.child),
                (i = null),
                n.alternate !== null &&
                  n.alternate.memoizedState !== null &&
                  n.alternate.memoizedState.cachePool !== null &&
                  (i = n.alternate.memoizedState.cachePool.pool),
                (s = null),
                n.memoizedState !== null &&
                  n.memoizedState.cachePool !== null &&
                  (s = n.memoizedState.cachePool.pool),
                s !== i && (n.flags |= 2048)),
              a !== e && a && (t.child.flags |= 8192),
              os(t, t.updateQueue),
              Xe(t),
              null)
        );
      case 4:
        return (Y(), e === null && ec(t.stateNode.containerInfo), Xe(t), null);
      case 10:
        return (da(t.type), Xe(t), null);
      case 19:
        if ((g(We), (n = t.memoizedState), n === null)) return (Xe(t), null);
        if (((i = (t.flags & 128) !== 0), (s = n.rendering), s === null))
          if (i) $l(n, !1);
          else {
            if ($e !== 0 || (e !== null && (e.flags & 128) !== 0))
              for (e = t.child; e !== null; ) {
                if (((s = Fi(e)), s !== null)) {
                  for (
                    t.flags |= 128,
                      $l(n, !1),
                      e = s.updateQueue,
                      t.updateQueue = e,
                      os(t, e),
                      t.subtreeFlags = 0,
                      e = a,
                      a = t.child;
                    a !== null;
                  )
                    (nf(a, e), (a = a.sibling));
                  return (
                    A(We, (We.current & 1) | 2),
                    Ne && oa(t, n.treeForkCount),
                    t.child
                  );
                }
                e = e.sibling;
              }
            n.tail !== null &&
              At() > ys &&
              ((t.flags |= 128), (i = !0), $l(n, !1), (t.lanes = 4194304));
          }
        else {
          if (!i)
            if (((e = Fi(s)), e !== null)) {
              if (
                ((t.flags |= 128),
                (i = !0),
                (e = e.updateQueue),
                (t.updateQueue = e),
                os(t, e),
                $l(n, !0),
                n.tail === null &&
                  n.tailMode === 'hidden' &&
                  !s.alternate &&
                  !Ne)
              )
                return (Xe(t), null);
            } else
              2 * At() - n.renderingStartTime > ys &&
                a !== 536870912 &&
                ((t.flags |= 128), (i = !0), $l(n, !1), (t.lanes = 4194304));
          n.isBackwards
            ? ((s.sibling = t.child), (t.child = s))
            : ((e = n.last),
              e !== null ? (e.sibling = s) : (t.child = s),
              (n.last = s));
        }
        return n.tail !== null
          ? ((e = n.tail),
            (n.rendering = e),
            (n.tail = e.sibling),
            (n.renderingStartTime = At()),
            (e.sibling = null),
            (a = We.current),
            A(We, i ? (a & 1) | 2 : a & 1),
            Ne && oa(t, n.treeForkCount),
            e)
          : (Xe(t), null);
      case 22:
      case 23:
        return (
          _t(t),
          tu(),
          (n = t.memoizedState !== null),
          e !== null
            ? (e.memoizedState !== null) !== n && (t.flags |= 8192)
            : n && (t.flags |= 8192),
          n
            ? (a & 536870912) !== 0 &&
              (t.flags & 128) === 0 &&
              (Xe(t), t.subtreeFlags & 6 && (t.flags |= 8192))
            : Xe(t),
          (a = t.updateQueue),
          a !== null && os(t, a.retryQueue),
          (a = null),
          e !== null &&
            e.memoizedState !== null &&
            e.memoizedState.cachePool !== null &&
            (a = e.memoizedState.cachePool.pool),
          (n = null),
          t.memoizedState !== null &&
            t.memoizedState.cachePool !== null &&
            (n = t.memoizedState.cachePool.pool),
          n !== a && (t.flags |= 2048),
          e !== null && g(bn),
          null
        );
      case 24:
        return (
          (a = null),
          e !== null && (a = e.memoizedState.cache),
          t.memoizedState.cache !== a && (t.flags |= 2048),
          da(Ie),
          Xe(t),
          null
        );
      case 25:
        return null;
      case 30:
        return null;
    }
    throw Error(c(156, t.tag));
  }
  function Ng(e, t) {
    switch ((Lr(t), t.tag)) {
      case 1:
        return (
          (e = t.flags),
          e & 65536 ? ((t.flags = (e & -65537) | 128), t) : null
        );
      case 3:
        return (
          da(Ie),
          Y(),
          (e = t.flags),
          (e & 65536) !== 0 && (e & 128) === 0
            ? ((t.flags = (e & -65537) | 128), t)
            : null
        );
      case 26:
      case 27:
      case 5:
        return (xe(t), null);
      case 31:
        if (t.memoizedState !== null) {
          if ((_t(t), t.alternate === null)) throw Error(c(340));
          yn();
        }
        return (
          (e = t.flags),
          e & 65536 ? ((t.flags = (e & -65537) | 128), t) : null
        );
      case 13:
        if (
          (_t(t), (e = t.memoizedState), e !== null && e.dehydrated !== null)
        ) {
          if (t.alternate === null) throw Error(c(340));
          yn();
        }
        return (
          (e = t.flags),
          e & 65536 ? ((t.flags = (e & -65537) | 128), t) : null
        );
      case 19:
        return (g(We), null);
      case 4:
        return (Y(), null);
      case 10:
        return (da(t.type), null);
      case 22:
      case 23:
        return (
          _t(t),
          tu(),
          e !== null && g(bn),
          (e = t.flags),
          e & 65536 ? ((t.flags = (e & -65537) | 128), t) : null
        );
      case 24:
        return (da(Ie), null);
      case 25:
        return null;
      default:
        return null;
    }
  }
  function Od(e, t) {
    switch ((Lr(t), t.tag)) {
      case 3:
        (da(Ie), Y());
        break;
      case 26:
      case 27:
      case 5:
        xe(t);
        break;
      case 4:
        Y();
        break;
      case 31:
        t.memoizedState !== null && _t(t);
        break;
      case 13:
        _t(t);
        break;
      case 19:
        g(We);
        break;
      case 10:
        da(t.type);
        break;
      case 22:
      case 23:
        (_t(t), tu(), e !== null && g(bn));
        break;
      case 24:
        da(Ie);
    }
  }
  function Wl(e, t) {
    try {
      var a = t.updateQueue,
        n = a !== null ? a.lastEffect : null;
      if (n !== null) {
        var i = n.next;
        a = i;
        do {
          if ((a.tag & e) === e) {
            n = void 0;
            var s = a.create,
              o = a.inst;
            ((n = s()), (o.destroy = n));
          }
          a = a.next;
        } while (a !== i);
      }
    } catch (y) {
      Me(t, t.return, y);
    }
  }
  function Ya(e, t, a) {
    try {
      var n = t.updateQueue,
        i = n !== null ? n.lastEffect : null;
      if (i !== null) {
        var s = i.next;
        n = s;
        do {
          if ((n.tag & e) === e) {
            var o = n.inst,
              y = o.destroy;
            if (y !== void 0) {
              ((o.destroy = void 0), (i = t));
              var T = a,
                C = y;
              try {
                C();
              } catch (H) {
                Me(i, T, H);
              }
            }
          }
          n = n.next;
        } while (n !== s);
      }
    } catch (H) {
      Me(t, t.return, H);
    }
  }
  function Cd(e) {
    var t = e.updateQueue;
    if (t !== null) {
      var a = e.stateNode;
      try {
        Ef(t, a);
      } catch (n) {
        Me(e, e.return, n);
      }
    }
  }
  function Md(e, t, a) {
    ((a.props = Tn(e.type, e.memoizedProps)), (a.state = e.memoizedState));
    try {
      a.componentWillUnmount();
    } catch (n) {
      Me(e, t, n);
    }
  }
  function Fl(e, t) {
    try {
      var a = e.ref;
      if (a !== null) {
        switch (e.tag) {
          case 26:
          case 27:
          case 5:
            var n = e.stateNode;
            break;
          case 30:
            n = e.stateNode;
            break;
          default:
            n = e.stateNode;
        }
        typeof a == 'function' ? (e.refCleanup = a(n)) : (a.current = n);
      }
    } catch (i) {
      Me(e, t, i);
    }
  }
  function It(e, t) {
    var a = e.ref,
      n = e.refCleanup;
    if (a !== null)
      if (typeof n == 'function')
        try {
          n();
        } catch (i) {
          Me(e, t, i);
        } finally {
          ((e.refCleanup = null),
            (e = e.alternate),
            e != null && (e.refCleanup = null));
        }
      else if (typeof a == 'function')
        try {
          a(null);
        } catch (i) {
          Me(e, t, i);
        }
      else a.current = null;
  }
  function Dd(e) {
    var t = e.type,
      a = e.memoizedProps,
      n = e.stateNode;
    try {
      e: switch (t) {
        case 'button':
        case 'input':
        case 'select':
        case 'textarea':
          a.autoFocus && n.focus();
          break e;
        case 'img':
          a.src ? (n.src = a.src) : a.srcSet && (n.srcset = a.srcSet);
      }
    } catch (i) {
      Me(e, e.return, i);
    }
  }
  function Mu(e, t, a) {
    try {
      var n = e.stateNode;
      ($g(n, e.type, a, t), (n[gt] = t));
    } catch (i) {
      Me(e, e.return, i);
    }
  }
  function Ud(e) {
    return (
      e.tag === 5 ||
      e.tag === 3 ||
      e.tag === 26 ||
      (e.tag === 27 && Ja(e.type)) ||
      e.tag === 4
    );
  }
  function Du(e) {
    e: for (;;) {
      for (; e.sibling === null; ) {
        if (e.return === null || Ud(e.return)) return null;
        e = e.return;
      }
      for (
        e.sibling.return = e.return, e = e.sibling;
        e.tag !== 5 && e.tag !== 6 && e.tag !== 18;
      ) {
        if (
          (e.tag === 27 && Ja(e.type)) ||
          e.flags & 2 ||
          e.child === null ||
          e.tag === 4
        )
          continue e;
        ((e.child.return = e), (e = e.child));
      }
      if (!(e.flags & 2)) return e.stateNode;
    }
  }
  function Uu(e, t, a) {
    var n = e.tag;
    if (n === 5 || n === 6)
      ((e = e.stateNode),
        t
          ? (a.nodeType === 9
              ? a.body
              : a.nodeName === 'HTML'
                ? a.ownerDocument.body
                : a
            ).insertBefore(e, t)
          : ((t =
              a.nodeType === 9
                ? a.body
                : a.nodeName === 'HTML'
                  ? a.ownerDocument.body
                  : a),
            t.appendChild(e),
            (a = a._reactRootContainer),
            a != null || t.onclick !== null || (t.onclick = ra)));
    else if (
      n !== 4 &&
      (n === 27 && Ja(e.type) && ((a = e.stateNode), (t = null)),
      (e = e.child),
      e !== null)
    )
      for (Uu(e, t, a), e = e.sibling; e !== null; )
        (Uu(e, t, a), (e = e.sibling));
  }
  function fs(e, t, a) {
    var n = e.tag;
    if (n === 5 || n === 6)
      ((e = e.stateNode), t ? a.insertBefore(e, t) : a.appendChild(e));
    else if (
      n !== 4 &&
      (n === 27 && Ja(e.type) && (a = e.stateNode), (e = e.child), e !== null)
    )
      for (fs(e, t, a), e = e.sibling; e !== null; )
        (fs(e, t, a), (e = e.sibling));
  }
  function kd(e) {
    var t = e.stateNode,
      a = e.memoizedProps;
    try {
      for (var n = e.type, i = t.attributes; i.length; )
        t.removeAttributeNode(i[0]);
      (ht(t, n, a), (t[ct] = e), (t[gt] = a));
    } catch (s) {
      Me(e, e.return, s);
    }
  }
  var ga = !1,
    tt = !1,
    ku = !1,
    Hd = typeof WeakSet == 'function' ? WeakSet : Set,
    rt = null;
  function Rg(e, t) {
    if (((e = e.containerInfo), (nc = Cs), (e = Jo(e)), zr(e))) {
      if ('selectionStart' in e)
        var a = { start: e.selectionStart, end: e.selectionEnd };
      else
        e: {
          a = ((a = e.ownerDocument) && a.defaultView) || window;
          var n = a.getSelection && a.getSelection();
          if (n && n.rangeCount !== 0) {
            a = n.anchorNode;
            var i = n.anchorOffset,
              s = n.focusNode;
            n = n.focusOffset;
            try {
              (a.nodeType, s.nodeType);
            } catch {
              a = null;
              break e;
            }
            var o = 0,
              y = -1,
              T = -1,
              C = 0,
              H = 0,
              X = e,
              M = null;
            t: for (;;) {
              for (
                var U;
                X !== a || (i !== 0 && X.nodeType !== 3) || (y = o + i),
                  X !== s || (n !== 0 && X.nodeType !== 3) || (T = o + n),
                  X.nodeType === 3 && (o += X.nodeValue.length),
                  (U = X.firstChild) !== null;
              )
                ((M = X), (X = U));
              for (;;) {
                if (X === e) break t;
                if (
                  (M === a && ++C === i && (y = o),
                  M === s && ++H === n && (T = o),
                  (U = X.nextSibling) !== null)
                )
                  break;
                ((X = M), (M = X.parentNode));
              }
              X = U;
            }
            a = y === -1 || T === -1 ? null : { start: y, end: T };
          } else a = null;
        }
      a = a || { start: 0, end: 0 };
    } else a = null;
    for (
      lc = { focusedElem: e, selectionRange: a }, Cs = !1, rt = t;
      rt !== null;
    )
      if (
        ((t = rt), (e = t.child), (t.subtreeFlags & 1028) !== 0 && e !== null)
      )
        ((e.return = t), (rt = e));
      else
        for (; rt !== null; ) {
          switch (((t = rt), (s = t.alternate), (e = t.flags), t.tag)) {
            case 0:
              if (
                (e & 4) !== 0 &&
                ((e = t.updateQueue),
                (e = e !== null ? e.events : null),
                e !== null)
              )
                for (a = 0; a < e.length; a++)
                  ((i = e[a]), (i.ref.impl = i.nextImpl));
              break;
            case 11:
            case 15:
              break;
            case 1:
              if ((e & 1024) !== 0 && s !== null) {
                ((e = void 0),
                  (a = t),
                  (i = s.memoizedProps),
                  (s = s.memoizedState),
                  (n = a.stateNode));
                try {
                  var ie = Tn(a.type, i);
                  ((e = n.getSnapshotBeforeUpdate(ie, s)),
                    (n.__reactInternalSnapshotBeforeUpdate = e));
                } catch (me) {
                  Me(a, a.return, me);
                }
              }
              break;
            case 3:
              if ((e & 1024) !== 0) {
                if (
                  ((e = t.stateNode.containerInfo), (a = e.nodeType), a === 9)
                )
                  rc(e);
                else if (a === 1)
                  switch (e.nodeName) {
                    case 'HEAD':
                    case 'HTML':
                    case 'BODY':
                      rc(e);
                      break;
                    default:
                      e.textContent = '';
                  }
              }
              break;
            case 5:
            case 26:
            case 27:
            case 6:
            case 4:
            case 17:
              break;
            default:
              if ((e & 1024) !== 0) throw Error(c(163));
          }
          if (((e = t.sibling), e !== null)) {
            ((e.return = t.return), (rt = e));
            break;
          }
          rt = t.return;
        }
  }
  function Bd(e, t, a) {
    var n = a.flags;
    switch (a.tag) {
      case 0:
      case 11:
      case 15:
        (va(e, a), n & 4 && Wl(5, a));
        break;
      case 1:
        if ((va(e, a), n & 4))
          if (((e = a.stateNode), t === null))
            try {
              e.componentDidMount();
            } catch (o) {
              Me(a, a.return, o);
            }
          else {
            var i = Tn(a.type, t.memoizedProps);
            t = t.memoizedState;
            try {
              e.componentDidUpdate(i, t, e.__reactInternalSnapshotBeforeUpdate);
            } catch (o) {
              Me(a, a.return, o);
            }
          }
        (n & 64 && Cd(a), n & 512 && Fl(a, a.return));
        break;
      case 3:
        if ((va(e, a), n & 64 && ((e = a.updateQueue), e !== null))) {
          if (((t = null), a.child !== null))
            switch (a.child.tag) {
              case 27:
              case 5:
                t = a.child.stateNode;
                break;
              case 1:
                t = a.child.stateNode;
            }
          try {
            Ef(e, t);
          } catch (o) {
            Me(a, a.return, o);
          }
        }
        break;
      case 27:
        t === null && n & 4 && kd(a);
      case 26:
      case 5:
        (va(e, a), t === null && n & 4 && Dd(a), n & 512 && Fl(a, a.return));
        break;
      case 12:
        va(e, a);
        break;
      case 31:
        (va(e, a), n & 4 && Yd(e, a));
        break;
      case 13:
        (va(e, a),
          n & 4 && Gd(e, a),
          n & 64 &&
            ((e = a.memoizedState),
            e !== null &&
              ((e = e.dehydrated),
              e !== null && ((a = Hg.bind(null, a)), nb(e, a)))));
        break;
      case 22:
        if (((n = a.memoizedState !== null || ga), !n)) {
          ((t = (t !== null && t.memoizedState !== null) || tt), (i = ga));
          var s = tt;
          ((ga = n),
            (tt = t) && !s ? xa(e, a, (a.subtreeFlags & 8772) !== 0) : va(e, a),
            (ga = i),
            (tt = s));
        }
        break;
      case 30:
        break;
      default:
        va(e, a);
    }
  }
  function qd(e) {
    var t = e.alternate;
    (t !== null && ((e.alternate = null), qd(t)),
      (e.child = null),
      (e.deletions = null),
      (e.sibling = null),
      e.tag === 5 && ((t = e.stateNode), t !== null && dr(t)),
      (e.stateNode = null),
      (e.return = null),
      (e.dependencies = null),
      (e.memoizedProps = null),
      (e.memoizedState = null),
      (e.pendingProps = null),
      (e.stateNode = null),
      (e.updateQueue = null));
  }
  var Ze = null,
    vt = !1;
  function ba(e, t, a) {
    for (a = a.child; a !== null; ) (Ld(e, t, a), (a = a.sibling));
  }
  function Ld(e, t, a) {
    if (wt && typeof wt.onCommitFiberUnmount == 'function')
      try {
        wt.onCommitFiberUnmount(Sl, a);
      } catch {}
    switch (a.tag) {
      case 26:
        (tt || It(a, t),
          ba(e, t, a),
          a.memoizedState
            ? a.memoizedState.count--
            : a.stateNode && ((a = a.stateNode), a.parentNode.removeChild(a)));
        break;
      case 27:
        tt || It(a, t);
        var n = Ze,
          i = vt;
        (Ja(a.type) && ((Ze = a.stateNode), (vt = !1)),
          ba(e, t, a),
          si(a.stateNode),
          (Ze = n),
          (vt = i));
        break;
      case 5:
        tt || It(a, t);
      case 6:
        if (
          ((n = Ze),
          (i = vt),
          (Ze = null),
          ba(e, t, a),
          (Ze = n),
          (vt = i),
          Ze !== null)
        )
          if (vt)
            try {
              (Ze.nodeType === 9
                ? Ze.body
                : Ze.nodeName === 'HTML'
                  ? Ze.ownerDocument.body
                  : Ze
              ).removeChild(a.stateNode);
            } catch (s) {
              Me(a, t, s);
            }
          else
            try {
              Ze.removeChild(a.stateNode);
            } catch (s) {
              Me(a, t, s);
            }
        break;
      case 18:
        Ze !== null &&
          (vt
            ? ((e = Ze),
              Ch(
                e.nodeType === 9
                  ? e.body
                  : e.nodeName === 'HTML'
                    ? e.ownerDocument.body
                    : e,
                a.stateNode,
              ),
              pl(e))
            : Ch(Ze, a.stateNode));
        break;
      case 4:
        ((n = Ze),
          (i = vt),
          (Ze = a.stateNode.containerInfo),
          (vt = !0),
          ba(e, t, a),
          (Ze = n),
          (vt = i));
        break;
      case 0:
      case 11:
      case 14:
      case 15:
        (Ya(2, a, t), tt || Ya(4, a, t), ba(e, t, a));
        break;
      case 1:
        (tt ||
          (It(a, t),
          (n = a.stateNode),
          typeof n.componentWillUnmount == 'function' && Md(a, t, n)),
          ba(e, t, a));
        break;
      case 21:
        ba(e, t, a);
        break;
      case 22:
        ((tt = (n = tt) || a.memoizedState !== null), ba(e, t, a), (tt = n));
        break;
      default:
        ba(e, t, a);
    }
  }
  function Yd(e, t) {
    if (
      t.memoizedState === null &&
      ((e = t.alternate), e !== null && ((e = e.memoizedState), e !== null))
    ) {
      e = e.dehydrated;
      try {
        pl(e);
      } catch (a) {
        Me(t, t.return, a);
      }
    }
  }
  function Gd(e, t) {
    if (
      t.memoizedState === null &&
      ((e = t.alternate),
      e !== null &&
        ((e = e.memoizedState), e !== null && ((e = e.dehydrated), e !== null)))
    )
      try {
        pl(e);
      } catch (a) {
        Me(t, t.return, a);
      }
  }
  function zg(e) {
    switch (e.tag) {
      case 31:
      case 13:
      case 19:
        var t = e.stateNode;
        return (t === null && (t = e.stateNode = new Hd()), t);
      case 22:
        return (
          (e = e.stateNode),
          (t = e._retryCache),
          t === null && (t = e._retryCache = new Hd()),
          t
        );
      default:
        throw Error(c(435, e.tag));
    }
  }
  function ds(e, t) {
    var a = zg(e);
    t.forEach(function (n) {
      if (!a.has(n)) {
        a.add(n);
        var i = Bg.bind(null, e, n);
        n.then(i, i);
      }
    });
  }
  function xt(e, t) {
    var a = t.deletions;
    if (a !== null)
      for (var n = 0; n < a.length; n++) {
        var i = a[n],
          s = e,
          o = t,
          y = o;
        e: for (; y !== null; ) {
          switch (y.tag) {
            case 27:
              if (Ja(y.type)) {
                ((Ze = y.stateNode), (vt = !1));
                break e;
              }
              break;
            case 5:
              ((Ze = y.stateNode), (vt = !1));
              break e;
            case 3:
            case 4:
              ((Ze = y.stateNode.containerInfo), (vt = !0));
              break e;
          }
          y = y.return;
        }
        if (Ze === null) throw Error(c(160));
        (Ld(s, o, i),
          (Ze = null),
          (vt = !1),
          (s = i.alternate),
          s !== null && (s.return = null),
          (i.return = null));
      }
    if (t.subtreeFlags & 13886)
      for (t = t.child; t !== null; ) (Xd(t, e), (t = t.sibling));
  }
  var Kt = null;
  function Xd(e, t) {
    var a = e.alternate,
      n = e.flags;
    switch (e.tag) {
      case 0:
      case 11:
      case 14:
      case 15:
        (xt(t, e),
          St(e),
          n & 4 && (Ya(3, e, e.return), Wl(3, e), Ya(5, e, e.return)));
        break;
      case 1:
        (xt(t, e),
          St(e),
          n & 512 && (tt || a === null || It(a, a.return)),
          n & 64 &&
            ga &&
            ((e = e.updateQueue),
            e !== null &&
              ((n = e.callbacks),
              n !== null &&
                ((a = e.shared.hiddenCallbacks),
                (e.shared.hiddenCallbacks = a === null ? n : a.concat(n))))));
        break;
      case 26:
        var i = Kt;
        if (
          (xt(t, e),
          St(e),
          n & 512 && (tt || a === null || It(a, a.return)),
          n & 4)
        ) {
          var s = a !== null ? a.memoizedState : null;
          if (((n = e.memoizedState), a === null))
            if (n === null)
              if (e.stateNode === null) {
                e: {
                  ((n = e.type),
                    (a = e.memoizedProps),
                    (i = i.ownerDocument || i));
                  t: switch (n) {
                    case 'title':
                      ((s = i.getElementsByTagName('title')[0]),
                        (!s ||
                          s[Al] ||
                          s[ct] ||
                          s.namespaceURI === 'http://www.w3.org/2000/svg' ||
                          s.hasAttribute('itemprop')) &&
                          ((s = i.createElement(n)),
                          i.head.insertBefore(
                            s,
                            i.querySelector('head > title'),
                          )),
                        ht(s, n, a),
                        (s[ct] = e),
                        st(s),
                        (n = s));
                      break e;
                    case 'link':
                      var o = Xh('link', 'href', i).get(n + (a.href || ''));
                      if (o) {
                        for (var y = 0; y < o.length; y++)
                          if (
                            ((s = o[y]),
                            s.getAttribute('href') ===
                              (a.href == null || a.href === ''
                                ? null
                                : a.href) &&
                              s.getAttribute('rel') ===
                                (a.rel == null ? null : a.rel) &&
                              s.getAttribute('title') ===
                                (a.title == null ? null : a.title) &&
                              s.getAttribute('crossorigin') ===
                                (a.crossOrigin == null ? null : a.crossOrigin))
                          ) {
                            o.splice(y, 1);
                            break t;
                          }
                      }
                      ((s = i.createElement(n)),
                        ht(s, n, a),
                        i.head.appendChild(s));
                      break;
                    case 'meta':
                      if (
                        (o = Xh('meta', 'content', i).get(
                          n + (a.content || ''),
                        ))
                      ) {
                        for (y = 0; y < o.length; y++)
                          if (
                            ((s = o[y]),
                            s.getAttribute('content') ===
                              (a.content == null ? null : '' + a.content) &&
                              s.getAttribute('name') ===
                                (a.name == null ? null : a.name) &&
                              s.getAttribute('property') ===
                                (a.property == null ? null : a.property) &&
                              s.getAttribute('http-equiv') ===
                                (a.httpEquiv == null ? null : a.httpEquiv) &&
                              s.getAttribute('charset') ===
                                (a.charSet == null ? null : a.charSet))
                          ) {
                            o.splice(y, 1);
                            break t;
                          }
                      }
                      ((s = i.createElement(n)),
                        ht(s, n, a),
                        i.head.appendChild(s));
                      break;
                    default:
                      throw Error(c(468, n));
                  }
                  ((s[ct] = e), st(s), (n = s));
                }
                e.stateNode = n;
              } else Zh(i, e.type, e.stateNode);
            else e.stateNode = Gh(i, n, e.memoizedProps);
          else
            s !== n
              ? (s === null
                  ? a.stateNode !== null &&
                    ((a = a.stateNode), a.parentNode.removeChild(a))
                  : s.count--,
                n === null
                  ? Zh(i, e.type, e.stateNode)
                  : Gh(i, n, e.memoizedProps))
              : n === null &&
                e.stateNode !== null &&
                Mu(e, e.memoizedProps, a.memoizedProps);
        }
        break;
      case 27:
        (xt(t, e),
          St(e),
          n & 512 && (tt || a === null || It(a, a.return)),
          a !== null && n & 4 && Mu(e, e.memoizedProps, a.memoizedProps));
        break;
      case 5:
        if (
          (xt(t, e),
          St(e),
          n & 512 && (tt || a === null || It(a, a.return)),
          e.flags & 32)
        ) {
          i = e.stateNode;
          try {
            qn(i, '');
          } catch (ie) {
            Me(e, e.return, ie);
          }
        }
        (n & 4 &&
          e.stateNode != null &&
          ((i = e.memoizedProps), Mu(e, i, a !== null ? a.memoizedProps : i)),
          n & 1024 && (ku = !0));
        break;
      case 6:
        if ((xt(t, e), St(e), n & 4)) {
          if (e.stateNode === null) throw Error(c(162));
          ((n = e.memoizedProps), (a = e.stateNode));
          try {
            a.nodeValue = n;
          } catch (ie) {
            Me(e, e.return, ie);
          }
        }
        break;
      case 3:
        if (
          ((Rs = null),
          (i = Kt),
          (Kt = js(t.containerInfo)),
          xt(t, e),
          (Kt = i),
          St(e),
          n & 4 && a !== null && a.memoizedState.isDehydrated)
        )
          try {
            pl(t.containerInfo);
          } catch (ie) {
            Me(e, e.return, ie);
          }
        ku && ((ku = !1), Zd(e));
        break;
      case 4:
        ((n = Kt),
          (Kt = js(e.stateNode.containerInfo)),
          xt(t, e),
          St(e),
          (Kt = n));
        break;
      case 12:
        (xt(t, e), St(e));
        break;
      case 31:
        (xt(t, e),
          St(e),
          n & 4 &&
            ((n = e.updateQueue),
            n !== null && ((e.updateQueue = null), ds(e, n))));
        break;
      case 13:
        (xt(t, e),
          St(e),
          e.child.flags & 8192 &&
            (e.memoizedState !== null) !=
              (a !== null && a.memoizedState !== null) &&
            (ms = At()),
          n & 4 &&
            ((n = e.updateQueue),
            n !== null && ((e.updateQueue = null), ds(e, n))));
        break;
      case 22:
        i = e.memoizedState !== null;
        var T = a !== null && a.memoizedState !== null,
          C = ga,
          H = tt;
        if (
          ((ga = C || i),
          (tt = H || T),
          xt(t, e),
          (tt = H),
          (ga = C),
          St(e),
          n & 8192)
        )
          e: for (
            t = e.stateNode,
              t._visibility = i ? t._visibility & -2 : t._visibility | 1,
              i && (a === null || T || ga || tt || An(e)),
              a = null,
              t = e;
            ;
          ) {
            if (t.tag === 5 || t.tag === 26) {
              if (a === null) {
                T = a = t;
                try {
                  if (((s = T.stateNode), i))
                    ((o = s.style),
                      typeof o.setProperty == 'function'
                        ? o.setProperty('display', 'none', 'important')
                        : (o.display = 'none'));
                  else {
                    y = T.stateNode;
                    var X = T.memoizedProps.style,
                      M =
                        X != null && X.hasOwnProperty('display')
                          ? X.display
                          : null;
                    y.style.display =
                      M == null || typeof M == 'boolean' ? '' : ('' + M).trim();
                  }
                } catch (ie) {
                  Me(T, T.return, ie);
                }
              }
            } else if (t.tag === 6) {
              if (a === null) {
                T = t;
                try {
                  T.stateNode.nodeValue = i ? '' : T.memoizedProps;
                } catch (ie) {
                  Me(T, T.return, ie);
                }
              }
            } else if (t.tag === 18) {
              if (a === null) {
                T = t;
                try {
                  var U = T.stateNode;
                  i ? Mh(U, !0) : Mh(T.stateNode, !1);
                } catch (ie) {
                  Me(T, T.return, ie);
                }
              }
            } else if (
              ((t.tag !== 22 && t.tag !== 23) ||
                t.memoizedState === null ||
                t === e) &&
              t.child !== null
            ) {
              ((t.child.return = t), (t = t.child));
              continue;
            }
            if (t === e) break e;
            for (; t.sibling === null; ) {
              if (t.return === null || t.return === e) break e;
              (a === t && (a = null), (t = t.return));
            }
            (a === t && (a = null),
              (t.sibling.return = t.return),
              (t = t.sibling));
          }
        n & 4 &&
          ((n = e.updateQueue),
          n !== null &&
            ((a = n.retryQueue),
            a !== null && ((n.retryQueue = null), ds(e, a))));
        break;
      case 19:
        (xt(t, e),
          St(e),
          n & 4 &&
            ((n = e.updateQueue),
            n !== null && ((e.updateQueue = null), ds(e, n))));
        break;
      case 30:
        break;
      case 21:
        break;
      default:
        (xt(t, e), St(e));
    }
  }
  function St(e) {
    var t = e.flags;
    if (t & 2) {
      try {
        for (var a, n = e.return; n !== null; ) {
          if (Ud(n)) {
            a = n;
            break;
          }
          n = n.return;
        }
        if (a == null) throw Error(c(160));
        switch (a.tag) {
          case 27:
            var i = a.stateNode,
              s = Du(e);
            fs(e, s, i);
            break;
          case 5:
            var o = a.stateNode;
            a.flags & 32 && (qn(o, ''), (a.flags &= -33));
            var y = Du(e);
            fs(e, y, o);
            break;
          case 3:
          case 4:
            var T = a.stateNode.containerInfo,
              C = Du(e);
            Uu(e, C, T);
            break;
          default:
            throw Error(c(161));
        }
      } catch (H) {
        Me(e, e.return, H);
      }
      e.flags &= -3;
    }
    t & 4096 && (e.flags &= -4097);
  }
  function Zd(e) {
    if (e.subtreeFlags & 1024)
      for (e = e.child; e !== null; ) {
        var t = e;
        (Zd(t),
          t.tag === 5 && t.flags & 1024 && t.stateNode.reset(),
          (e = e.sibling));
      }
  }
  function va(e, t) {
    if (t.subtreeFlags & 8772)
      for (t = t.child; t !== null; ) (Bd(e, t.alternate, t), (t = t.sibling));
  }
  function An(e) {
    for (e = e.child; e !== null; ) {
      var t = e;
      switch (t.tag) {
        case 0:
        case 11:
        case 14:
        case 15:
          (Ya(4, t, t.return), An(t));
          break;
        case 1:
          It(t, t.return);
          var a = t.stateNode;
          (typeof a.componentWillUnmount == 'function' && Md(t, t.return, a),
            An(t));
          break;
        case 27:
          si(t.stateNode);
        case 26:
        case 5:
          (It(t, t.return), An(t));
          break;
        case 22:
          t.memoizedState === null && An(t);
          break;
        case 30:
          An(t);
          break;
        default:
          An(t);
      }
      e = e.sibling;
    }
  }
  function xa(e, t, a) {
    for (a = a && (t.subtreeFlags & 8772) !== 0, t = t.child; t !== null; ) {
      var n = t.alternate,
        i = e,
        s = t,
        o = s.flags;
      switch (s.tag) {
        case 0:
        case 11:
        case 15:
          (xa(i, s, a), Wl(4, s));
          break;
        case 1:
          if (
            (xa(i, s, a),
            (n = s),
            (i = n.stateNode),
            typeof i.componentDidMount == 'function')
          )
            try {
              i.componentDidMount();
            } catch (C) {
              Me(n, n.return, C);
            }
          if (((n = s), (i = n.updateQueue), i !== null)) {
            var y = n.stateNode;
            try {
              var T = i.shared.hiddenCallbacks;
              if (T !== null)
                for (i.shared.hiddenCallbacks = null, i = 0; i < T.length; i++)
                  Sf(T[i], y);
            } catch (C) {
              Me(n, n.return, C);
            }
          }
          (a && o & 64 && Cd(s), Fl(s, s.return));
          break;
        case 27:
          kd(s);
        case 26:
        case 5:
          (xa(i, s, a), a && n === null && o & 4 && Dd(s), Fl(s, s.return));
          break;
        case 12:
          xa(i, s, a);
          break;
        case 31:
          (xa(i, s, a), a && o & 4 && Yd(i, s));
          break;
        case 13:
          (xa(i, s, a), a && o & 4 && Gd(i, s));
          break;
        case 22:
          (s.memoizedState === null && xa(i, s, a), Fl(s, s.return));
          break;
        case 30:
          break;
        default:
          xa(i, s, a);
      }
      t = t.sibling;
    }
  }
  function Hu(e, t) {
    var a = null;
    (e !== null &&
      e.memoizedState !== null &&
      e.memoizedState.cachePool !== null &&
      (a = e.memoizedState.cachePool.pool),
      (e = null),
      t.memoizedState !== null &&
        t.memoizedState.cachePool !== null &&
        (e = t.memoizedState.cachePool.pool),
      e !== a && (e != null && e.refCount++, a != null && Hl(a)));
  }
  function Bu(e, t) {
    ((e = null),
      t.alternate !== null && (e = t.alternate.memoizedState.cache),
      (t = t.memoizedState.cache),
      t !== e && (t.refCount++, e != null && Hl(e)));
  }
  function Jt(e, t, a, n) {
    if (t.subtreeFlags & 10256)
      for (t = t.child; t !== null; ) (Qd(e, t, a, n), (t = t.sibling));
  }
  function Qd(e, t, a, n) {
    var i = t.flags;
    switch (t.tag) {
      case 0:
      case 11:
      case 15:
        (Jt(e, t, a, n), i & 2048 && Wl(9, t));
        break;
      case 1:
        Jt(e, t, a, n);
        break;
      case 3:
        (Jt(e, t, a, n),
          i & 2048 &&
            ((e = null),
            t.alternate !== null && (e = t.alternate.memoizedState.cache),
            (t = t.memoizedState.cache),
            t !== e && (t.refCount++, e != null && Hl(e))));
        break;
      case 12:
        if (i & 2048) {
          (Jt(e, t, a, n), (e = t.stateNode));
          try {
            var s = t.memoizedProps,
              o = s.id,
              y = s.onPostCommit;
            typeof y == 'function' &&
              y(
                o,
                t.alternate === null ? 'mount' : 'update',
                e.passiveEffectDuration,
                -0,
              );
          } catch (T) {
            Me(t, t.return, T);
          }
        } else Jt(e, t, a, n);
        break;
      case 31:
        Jt(e, t, a, n);
        break;
      case 13:
        Jt(e, t, a, n);
        break;
      case 23:
        break;
      case 22:
        ((s = t.stateNode),
          (o = t.alternate),
          t.memoizedState !== null
            ? s._visibility & 2
              ? Jt(e, t, a, n)
              : Il(e, t)
            : s._visibility & 2
              ? Jt(e, t, a, n)
              : ((s._visibility |= 2),
                il(e, t, a, n, (t.subtreeFlags & 10256) !== 0 || !1)),
          i & 2048 && Hu(o, t));
        break;
      case 24:
        (Jt(e, t, a, n), i & 2048 && Bu(t.alternate, t));
        break;
      default:
        Jt(e, t, a, n);
    }
  }
  function il(e, t, a, n, i) {
    for (
      i = i && ((t.subtreeFlags & 10256) !== 0 || !1), t = t.child;
      t !== null;
    ) {
      var s = e,
        o = t,
        y = a,
        T = n,
        C = o.flags;
      switch (o.tag) {
        case 0:
        case 11:
        case 15:
          (il(s, o, y, T, i), Wl(8, o));
          break;
        case 23:
          break;
        case 22:
          var H = o.stateNode;
          (o.memoizedState !== null
            ? H._visibility & 2
              ? il(s, o, y, T, i)
              : Il(s, o)
            : ((H._visibility |= 2), il(s, o, y, T, i)),
            i && C & 2048 && Hu(o.alternate, o));
          break;
        case 24:
          (il(s, o, y, T, i), i && C & 2048 && Bu(o.alternate, o));
          break;
        default:
          il(s, o, y, T, i);
      }
      t = t.sibling;
    }
  }
  function Il(e, t) {
    if (t.subtreeFlags & 10256)
      for (t = t.child; t !== null; ) {
        var a = e,
          n = t,
          i = n.flags;
        switch (n.tag) {
          case 22:
            (Il(a, n), i & 2048 && Hu(n.alternate, n));
            break;
          case 24:
            (Il(a, n), i & 2048 && Bu(n.alternate, n));
            break;
          default:
            Il(a, n);
        }
        t = t.sibling;
      }
  }
  var Pl = 8192;
  function sl(e, t, a) {
    if (e.subtreeFlags & Pl)
      for (e = e.child; e !== null; ) (Vd(e, t, a), (e = e.sibling));
  }
  function Vd(e, t, a) {
    switch (e.tag) {
      case 26:
        (sl(e, t, a),
          e.flags & Pl &&
            e.memoizedState !== null &&
            yb(a, Kt, e.memoizedState, e.memoizedProps));
        break;
      case 5:
        sl(e, t, a);
        break;
      case 3:
      case 4:
        var n = Kt;
        ((Kt = js(e.stateNode.containerInfo)), sl(e, t, a), (Kt = n));
        break;
      case 22:
        e.memoizedState === null &&
          ((n = e.alternate),
          n !== null && n.memoizedState !== null
            ? ((n = Pl), (Pl = 16777216), sl(e, t, a), (Pl = n))
            : sl(e, t, a));
        break;
      default:
        sl(e, t, a);
    }
  }
  function Kd(e) {
    var t = e.alternate;
    if (t !== null && ((e = t.child), e !== null)) {
      t.child = null;
      do ((t = e.sibling), (e.sibling = null), (e = t));
      while (e !== null);
    }
  }
  function ei(e) {
    var t = e.deletions;
    if ((e.flags & 16) !== 0) {
      if (t !== null)
        for (var a = 0; a < t.length; a++) {
          var n = t[a];
          ((rt = n), $d(n, e));
        }
      Kd(e);
    }
    if (e.subtreeFlags & 10256)
      for (e = e.child; e !== null; ) (Jd(e), (e = e.sibling));
  }
  function Jd(e) {
    switch (e.tag) {
      case 0:
      case 11:
      case 15:
        (ei(e), e.flags & 2048 && Ya(9, e, e.return));
        break;
      case 3:
        ei(e);
        break;
      case 12:
        ei(e);
        break;
      case 22:
        var t = e.stateNode;
        e.memoizedState !== null &&
        t._visibility & 2 &&
        (e.return === null || e.return.tag !== 13)
          ? ((t._visibility &= -3), hs(e))
          : ei(e);
        break;
      default:
        ei(e);
    }
  }
  function hs(e) {
    var t = e.deletions;
    if ((e.flags & 16) !== 0) {
      if (t !== null)
        for (var a = 0; a < t.length; a++) {
          var n = t[a];
          ((rt = n), $d(n, e));
        }
      Kd(e);
    }
    for (e = e.child; e !== null; ) {
      switch (((t = e), t.tag)) {
        case 0:
        case 11:
        case 15:
          (Ya(8, t, t.return), hs(t));
          break;
        case 22:
          ((a = t.stateNode),
            a._visibility & 2 && ((a._visibility &= -3), hs(t)));
          break;
        default:
          hs(t);
      }
      e = e.sibling;
    }
  }
  function $d(e, t) {
    for (; rt !== null; ) {
      var a = rt;
      switch (a.tag) {
        case 0:
        case 11:
        case 15:
          Ya(8, a, t);
          break;
        case 23:
        case 22:
          if (a.memoizedState !== null && a.memoizedState.cachePool !== null) {
            var n = a.memoizedState.cachePool.pool;
            n != null && n.refCount++;
          }
          break;
        case 24:
          Hl(a.memoizedState.cache);
      }
      if (((n = a.child), n !== null)) ((n.return = a), (rt = n));
      else
        e: for (a = e; rt !== null; ) {
          n = rt;
          var i = n.sibling,
            s = n.return;
          if ((qd(n), n === a)) {
            rt = null;
            break e;
          }
          if (i !== null) {
            ((i.return = s), (rt = i));
            break e;
          }
          rt = s;
        }
    }
  }
  var _g = {
      getCacheForType: function (e) {
        var t = ft(Ie),
          a = t.data.get(e);
        return (a === void 0 && ((a = e()), t.data.set(e, a)), a);
      },
      cacheSignal: function () {
        return ft(Ie).controller.signal;
      },
    },
    Og = typeof WeakMap == 'function' ? WeakMap : Map,
    Oe = 0,
    qe = null,
    Te = null,
    we = 0,
    Ce = 0,
    Ot = null,
    Ga = !1,
    rl = !1,
    qu = !1,
    Sa = 0,
    $e = 0,
    Xa = 0,
    wn = 0,
    Lu = 0,
    Ct = 0,
    ul = 0,
    ti = null,
    Et = null,
    Yu = !1,
    ms = 0,
    Wd = 0,
    ys = 1 / 0,
    ps = null,
    Za = null,
    nt = 0,
    Qa = null,
    cl = null,
    Ea = 0,
    Gu = 0,
    Xu = null,
    Fd = null,
    ai = 0,
    Zu = null;
  function Mt() {
    return (Oe & 2) !== 0 && we !== 0 ? we & -we : z.T !== null ? Wu() : fo();
  }
  function Id() {
    if (Ct === 0)
      if ((we & 536870912) === 0 || Ne) {
        var e = Ai;
        ((Ai <<= 1), (Ai & 3932160) === 0 && (Ai = 262144), (Ct = e));
      } else Ct = 536870912;
    return ((e = zt.current), e !== null && (e.flags |= 32), Ct);
  }
  function Tt(e, t, a) {
    (((e === qe && (Ce === 2 || Ce === 9)) || e.cancelPendingCommit !== null) &&
      (ol(e, 0), Va(e, we, Ct, !1)),
      Tl(e, a),
      ((Oe & 2) === 0 || e !== qe) &&
        (e === qe &&
          ((Oe & 2) === 0 && (wn |= a), $e === 4 && Va(e, we, Ct, !1)),
        Pt(e)));
  }
  function Pd(e, t, a) {
    if ((Oe & 6) !== 0) throw Error(c(327));
    var n = (!a && (t & 127) === 0 && (t & e.expiredLanes) === 0) || El(e, t),
      i = n ? Dg(e, t) : Vu(e, t, !0),
      s = n;
    do {
      if (i === 0) {
        rl && !n && Va(e, t, 0, !1);
        break;
      } else {
        if (((a = e.current.alternate), s && !Cg(a))) {
          ((i = Vu(e, t, !1)), (s = !1));
          continue;
        }
        if (i === 2) {
          if (((s = t), e.errorRecoveryDisabledLanes & s)) var o = 0;
          else
            ((o = e.pendingLanes & -536870913),
              (o = o !== 0 ? o : o & 536870912 ? 536870912 : 0));
          if (o !== 0) {
            t = o;
            e: {
              var y = e;
              i = ti;
              var T = y.current.memoizedState.isDehydrated;
              if ((T && (ol(y, o).flags |= 256), (o = Vu(y, o, !1)), o !== 2)) {
                if (qu && !T) {
                  ((y.errorRecoveryDisabledLanes |= s), (wn |= s), (i = 4));
                  break e;
                }
                ((s = Et),
                  (Et = i),
                  s !== null &&
                    (Et === null ? (Et = s) : Et.push.apply(Et, s)));
              }
              i = o;
            }
            if (((s = !1), i !== 2)) continue;
          }
        }
        if (i === 1) {
          (ol(e, 0), Va(e, t, 0, !0));
          break;
        }
        e: {
          switch (((n = e), (s = i), s)) {
            case 0:
            case 1:
              throw Error(c(345));
            case 4:
              if ((t & 4194048) !== t) break;
            case 6:
              Va(n, t, Ct, !Ga);
              break e;
            case 2:
              Et = null;
              break;
            case 3:
            case 5:
              break;
            default:
              throw Error(c(329));
          }
          if ((t & 62914560) === t && ((i = ms + 300 - At()), 10 < i)) {
            if ((Va(n, t, Ct, !Ga), ji(n, 0, !0) !== 0)) break e;
            ((Ea = t),
              (n.timeoutHandle = _h(
                eh.bind(
                  null,
                  n,
                  a,
                  Et,
                  ps,
                  Yu,
                  t,
                  Ct,
                  wn,
                  ul,
                  Ga,
                  s,
                  'Throttled',
                  -0,
                  0,
                ),
                i,
              )));
            break e;
          }
          eh(n, a, Et, ps, Yu, t, Ct, wn, ul, Ga, s, null, -0, 0);
        }
      }
      break;
    } while (!0);
    Pt(e);
  }
  function eh(e, t, a, n, i, s, o, y, T, C, H, X, M, U) {
    if (
      ((e.timeoutHandle = -1),
      (X = t.subtreeFlags),
      X & 8192 || (X & 16785408) === 16785408)
    ) {
      ((X = {
        stylesheets: null,
        count: 0,
        imgCount: 0,
        imgBytes: 0,
        suspenseyImages: [],
        waitingForImages: !0,
        waitingForViewTransition: !1,
        unsuspend: ra,
      }),
        Vd(t, s, X));
      var ie =
        (s & 62914560) === s ? ms - At() : (s & 4194048) === s ? Wd - At() : 0;
      if (((ie = pb(X, ie)), ie !== null)) {
        ((Ea = s),
          (e.cancelPendingCommit = ie(
            uh.bind(null, e, t, s, a, n, i, o, y, T, H, X, null, M, U),
          )),
          Va(e, s, o, !C));
        return;
      }
    }
    uh(e, t, s, a, n, i, o, y, T);
  }
  function Cg(e) {
    for (var t = e; ; ) {
      var a = t.tag;
      if (
        (a === 0 || a === 11 || a === 15) &&
        t.flags & 16384 &&
        ((a = t.updateQueue), a !== null && ((a = a.stores), a !== null))
      )
        for (var n = 0; n < a.length; n++) {
          var i = a[n],
            s = i.getSnapshot;
          i = i.value;
          try {
            if (!Nt(s(), i)) return !1;
          } catch {
            return !1;
          }
        }
      if (((a = t.child), t.subtreeFlags & 16384 && a !== null))
        ((a.return = t), (t = a));
      else {
        if (t === e) break;
        for (; t.sibling === null; ) {
          if (t.return === null || t.return === e) return !0;
          t = t.return;
        }
        ((t.sibling.return = t.return), (t = t.sibling));
      }
    }
    return !0;
  }
  function Va(e, t, a, n) {
    ((t &= ~Lu),
      (t &= ~wn),
      (e.suspendedLanes |= t),
      (e.pingedLanes &= ~t),
      n && (e.warmLanes |= t),
      (n = e.expirationTimes));
    for (var i = t; 0 < i; ) {
      var s = 31 - jt(i),
        o = 1 << s;
      ((n[s] = -1), (i &= ~o));
    }
    a !== 0 && uo(e, a, t);
  }
  function gs() {
    return (Oe & 6) === 0 ? (ni(0), !1) : !0;
  }
  function Qu() {
    if (Te !== null) {
      if (Ce === 0) var e = Te.return;
      else ((e = Te), (fa = pn = null), ru(e), (el = null), (ql = 0), (e = Te));
      for (; e !== null; ) (Od(e.alternate, e), (e = e.return));
      Te = null;
    }
  }
  function ol(e, t) {
    var a = e.timeoutHandle;
    (a !== -1 && ((e.timeoutHandle = -1), Ig(a)),
      (a = e.cancelPendingCommit),
      a !== null && ((e.cancelPendingCommit = null), a()),
      (Ea = 0),
      Qu(),
      (qe = e),
      (Te = a = ca(e.current, null)),
      (we = t),
      (Ce = 0),
      (Ot = null),
      (Ga = !1),
      (rl = El(e, t)),
      (qu = !1),
      (ul = Ct = Lu = wn = Xa = $e = 0),
      (Et = ti = null),
      (Yu = !1),
      (t & 8) !== 0 && (t |= t & 32));
    var n = e.entangledLanes;
    if (n !== 0)
      for (e = e.entanglements, n &= t; 0 < n; ) {
        var i = 31 - jt(n),
          s = 1 << i;
        ((t |= e[i]), (n &= ~s));
      }
    return ((Sa = t), Bi(), a);
  }
  function th(e, t) {
    ((be = null),
      (z.H = Kl),
      t === Pn || t === Vi
        ? ((t = gf()), (Ce = 3))
        : t === $r
          ? ((t = gf()), (Ce = 4))
          : (Ce =
              t === Tu
                ? 8
                : t !== null &&
                    typeof t == 'object' &&
                    typeof t.then == 'function'
                  ? 6
                  : 1),
      (Ot = t),
      Te === null && (($e = 1), ss(e, Bt(t, e.current))));
  }
  function ah() {
    var e = zt.current;
    return e === null
      ? !0
      : (we & 4194048) === we
        ? Gt === null
        : (we & 62914560) === we || (we & 536870912) !== 0
          ? e === Gt
          : !1;
  }
  function nh() {
    var e = z.H;
    return ((z.H = Kl), e === null ? Kl : e);
  }
  function lh() {
    var e = z.A;
    return ((z.A = _g), e);
  }
  function bs() {
    (($e = 4),
      Ga || ((we & 4194048) !== we && zt.current !== null) || (rl = !0),
      ((Xa & 134217727) === 0 && (wn & 134217727) === 0) ||
        qe === null ||
        Va(qe, we, Ct, !1));
  }
  function Vu(e, t, a) {
    var n = Oe;
    Oe |= 2;
    var i = nh(),
      s = lh();
    ((qe !== e || we !== t) && ((ps = null), ol(e, t)), (t = !1));
    var o = $e;
    e: do
      try {
        if (Ce !== 0 && Te !== null) {
          var y = Te,
            T = Ot;
          switch (Ce) {
            case 8:
              (Qu(), (o = 6));
              break e;
            case 3:
            case 2:
            case 9:
            case 6:
              zt.current === null && (t = !0);
              var C = Ce;
              if (((Ce = 0), (Ot = null), fl(e, y, T, C), a && rl)) {
                o = 0;
                break e;
              }
              break;
            default:
              ((C = Ce), (Ce = 0), (Ot = null), fl(e, y, T, C));
          }
        }
        (Mg(), (o = $e));
        break;
      } catch (H) {
        th(e, H);
      }
    while (!0);
    return (
      t && e.shellSuspendCounter++,
      (fa = pn = null),
      (Oe = n),
      (z.H = i),
      (z.A = s),
      Te === null && ((qe = null), (we = 0), Bi()),
      o
    );
  }
  function Mg() {
    for (; Te !== null; ) ih(Te);
  }
  function Dg(e, t) {
    var a = Oe;
    Oe |= 2;
    var n = nh(),
      i = lh();
    qe !== e || we !== t
      ? ((ps = null), (ys = At() + 500), ol(e, t))
      : (rl = El(e, t));
    e: do
      try {
        if (Ce !== 0 && Te !== null) {
          t = Te;
          var s = Ot;
          t: switch (Ce) {
            case 1:
              ((Ce = 0), (Ot = null), fl(e, t, s, 1));
              break;
            case 2:
            case 9:
              if (yf(s)) {
                ((Ce = 0), (Ot = null), sh(t));
                break;
              }
              ((t = function () {
                ((Ce !== 2 && Ce !== 9) || qe !== e || (Ce = 7), Pt(e));
              }),
                s.then(t, t));
              break e;
            case 3:
              Ce = 7;
              break e;
            case 4:
              Ce = 5;
              break e;
            case 7:
              yf(s)
                ? ((Ce = 0), (Ot = null), sh(t))
                : ((Ce = 0), (Ot = null), fl(e, t, s, 7));
              break;
            case 5:
              var o = null;
              switch (Te.tag) {
                case 26:
                  o = Te.memoizedState;
                case 5:
                case 27:
                  var y = Te;
                  if (o ? Qh(o) : y.stateNode.complete) {
                    ((Ce = 0), (Ot = null));
                    var T = y.sibling;
                    if (T !== null) Te = T;
                    else {
                      var C = y.return;
                      C !== null ? ((Te = C), vs(C)) : (Te = null);
                    }
                    break t;
                  }
              }
              ((Ce = 0), (Ot = null), fl(e, t, s, 5));
              break;
            case 6:
              ((Ce = 0), (Ot = null), fl(e, t, s, 6));
              break;
            case 8:
              (Qu(), ($e = 6));
              break e;
            default:
              throw Error(c(462));
          }
        }
        Ug();
        break;
      } catch (H) {
        th(e, H);
      }
    while (!0);
    return (
      (fa = pn = null),
      (z.H = n),
      (z.A = i),
      (Oe = a),
      Te !== null ? 0 : ((qe = null), (we = 0), Bi(), $e)
    );
  }
  function Ug() {
    for (; Te !== null && !lp(); ) ih(Te);
  }
  function ih(e) {
    var t = zd(e.alternate, e, Sa);
    ((e.memoizedProps = e.pendingProps), t === null ? vs(e) : (Te = t));
  }
  function sh(e) {
    var t = e,
      a = t.alternate;
    switch (t.tag) {
      case 15:
      case 0:
        t = Td(a, t, t.pendingProps, t.type, void 0, we);
        break;
      case 11:
        t = Td(a, t, t.pendingProps, t.type.render, t.ref, we);
        break;
      case 5:
        ru(t);
      default:
        (Od(a, t), (t = Te = nf(t, Sa)), (t = zd(a, t, Sa)));
    }
    ((e.memoizedProps = e.pendingProps), t === null ? vs(e) : (Te = t));
  }
  function fl(e, t, a, n) {
    ((fa = pn = null), ru(t), (el = null), (ql = 0));
    var i = t.return;
    try {
      if (Tg(e, i, t, a, we)) {
        (($e = 1), ss(e, Bt(a, e.current)), (Te = null));
        return;
      }
    } catch (s) {
      if (i !== null) throw ((Te = i), s);
      (($e = 1), ss(e, Bt(a, e.current)), (Te = null));
      return;
    }
    t.flags & 32768
      ? (Ne || n === 1
          ? (e = !0)
          : rl || (we & 536870912) !== 0
            ? (e = !1)
            : ((Ga = e = !0),
              (n === 2 || n === 9 || n === 3 || n === 6) &&
                ((n = zt.current),
                n !== null && n.tag === 13 && (n.flags |= 16384))),
        rh(t, e))
      : vs(t);
  }
  function vs(e) {
    var t = e;
    do {
      if ((t.flags & 32768) !== 0) {
        rh(t, Ga);
        return;
      }
      e = t.return;
      var a = jg(t.alternate, t, Sa);
      if (a !== null) {
        Te = a;
        return;
      }
      if (((t = t.sibling), t !== null)) {
        Te = t;
        return;
      }
      Te = t = e;
    } while (t !== null);
    $e === 0 && ($e = 5);
  }
  function rh(e, t) {
    do {
      var a = Ng(e.alternate, e);
      if (a !== null) {
        ((a.flags &= 32767), (Te = a));
        return;
      }
      if (
        ((a = e.return),
        a !== null &&
          ((a.flags |= 32768), (a.subtreeFlags = 0), (a.deletions = null)),
        !t && ((e = e.sibling), e !== null))
      ) {
        Te = e;
        return;
      }
      Te = e = a;
    } while (e !== null);
    (($e = 6), (Te = null));
  }
  function uh(e, t, a, n, i, s, o, y, T) {
    e.cancelPendingCommit = null;
    do xs();
    while (nt !== 0);
    if ((Oe & 6) !== 0) throw Error(c(327));
    if (t !== null) {
      if (t === e.current) throw Error(c(177));
      if (
        ((s = t.lanes | t.childLanes),
        (s |= Dr),
        mp(e, a, s, o, y, T),
        e === qe && ((Te = qe = null), (we = 0)),
        (cl = t),
        (Qa = e),
        (Ea = a),
        (Gu = s),
        (Xu = i),
        (Fd = n),
        (t.subtreeFlags & 10256) !== 0 || (t.flags & 10256) !== 0
          ? ((e.callbackNode = null),
            (e.callbackPriority = 0),
            qg(Ei, function () {
              return (hh(), null);
            }))
          : ((e.callbackNode = null), (e.callbackPriority = 0)),
        (n = (t.flags & 13878) !== 0),
        (t.subtreeFlags & 13878) !== 0 || n)
      ) {
        ((n = z.T), (z.T = null), (i = q.p), (q.p = 2), (o = Oe), (Oe |= 4));
        try {
          Rg(e, t, a);
        } finally {
          ((Oe = o), (q.p = i), (z.T = n));
        }
      }
      ((nt = 1), ch(), oh(), fh());
    }
  }
  function ch() {
    if (nt === 1) {
      nt = 0;
      var e = Qa,
        t = cl,
        a = (t.flags & 13878) !== 0;
      if ((t.subtreeFlags & 13878) !== 0 || a) {
        ((a = z.T), (z.T = null));
        var n = q.p;
        q.p = 2;
        var i = Oe;
        Oe |= 4;
        try {
          Xd(t, e);
          var s = lc,
            o = Jo(e.containerInfo),
            y = s.focusedElem,
            T = s.selectionRange;
          if (
            o !== y &&
            y &&
            y.ownerDocument &&
            Ko(y.ownerDocument.documentElement, y)
          ) {
            if (T !== null && zr(y)) {
              var C = T.start,
                H = T.end;
              if ((H === void 0 && (H = C), 'selectionStart' in y))
                ((y.selectionStart = C),
                  (y.selectionEnd = Math.min(H, y.value.length)));
              else {
                var X = y.ownerDocument || document,
                  M = (X && X.defaultView) || window;
                if (M.getSelection) {
                  var U = M.getSelection(),
                    ie = y.textContent.length,
                    me = Math.min(T.start, ie),
                    He = T.end === void 0 ? me : Math.min(T.end, ie);
                  !U.extend && me > He && ((o = He), (He = me), (me = o));
                  var R = Vo(y, me),
                    j = Vo(y, He);
                  if (
                    R &&
                    j &&
                    (U.rangeCount !== 1 ||
                      U.anchorNode !== R.node ||
                      U.anchorOffset !== R.offset ||
                      U.focusNode !== j.node ||
                      U.focusOffset !== j.offset)
                  ) {
                    var O = X.createRange();
                    (O.setStart(R.node, R.offset),
                      U.removeAllRanges(),
                      me > He
                        ? (U.addRange(O), U.extend(j.node, j.offset))
                        : (O.setEnd(j.node, j.offset), U.addRange(O)));
                  }
                }
              }
            }
            for (X = [], U = y; (U = U.parentNode); )
              U.nodeType === 1 &&
                X.push({ element: U, left: U.scrollLeft, top: U.scrollTop });
            for (
              typeof y.focus == 'function' && y.focus(), y = 0;
              y < X.length;
              y++
            ) {
              var L = X[y];
              ((L.element.scrollLeft = L.left), (L.element.scrollTop = L.top));
            }
          }
          ((Cs = !!nc), (lc = nc = null));
        } finally {
          ((Oe = i), (q.p = n), (z.T = a));
        }
      }
      ((e.current = t), (nt = 2));
    }
  }
  function oh() {
    if (nt === 2) {
      nt = 0;
      var e = Qa,
        t = cl,
        a = (t.flags & 8772) !== 0;
      if ((t.subtreeFlags & 8772) !== 0 || a) {
        ((a = z.T), (z.T = null));
        var n = q.p;
        q.p = 2;
        var i = Oe;
        Oe |= 4;
        try {
          Bd(e, t.alternate, t);
        } finally {
          ((Oe = i), (q.p = n), (z.T = a));
        }
      }
      nt = 3;
    }
  }
  function fh() {
    if (nt === 4 || nt === 3) {
      ((nt = 0), ip());
      var e = Qa,
        t = cl,
        a = Ea,
        n = Fd;
      (t.subtreeFlags & 10256) !== 0 || (t.flags & 10256) !== 0
        ? (nt = 5)
        : ((nt = 0), (cl = Qa = null), dh(e, e.pendingLanes));
      var i = e.pendingLanes;
      if (
        (i === 0 && (Za = null),
        or(a),
        (t = t.stateNode),
        wt && typeof wt.onCommitFiberRoot == 'function')
      )
        try {
          wt.onCommitFiberRoot(Sl, t, void 0, (t.current.flags & 128) === 128);
        } catch {}
      if (n !== null) {
        ((t = z.T), (i = q.p), (q.p = 2), (z.T = null));
        try {
          for (var s = e.onRecoverableError, o = 0; o < n.length; o++) {
            var y = n[o];
            s(y.value, { componentStack: y.stack });
          }
        } finally {
          ((z.T = t), (q.p = i));
        }
      }
      ((Ea & 3) !== 0 && xs(),
        Pt(e),
        (i = e.pendingLanes),
        (a & 261930) !== 0 && (i & 42) !== 0
          ? e === Zu
            ? ai++
            : ((ai = 0), (Zu = e))
          : (ai = 0),
        ni(0));
    }
  }
  function dh(e, t) {
    (e.pooledCacheLanes &= t) === 0 &&
      ((t = e.pooledCache), t != null && ((e.pooledCache = null), Hl(t)));
  }
  function xs() {
    return (ch(), oh(), fh(), hh());
  }
  function hh() {
    if (nt !== 5) return !1;
    var e = Qa,
      t = Gu;
    Gu = 0;
    var a = or(Ea),
      n = z.T,
      i = q.p;
    try {
      ((q.p = 32 > a ? 32 : a), (z.T = null), (a = Xu), (Xu = null));
      var s = Qa,
        o = Ea;
      if (((nt = 0), (cl = Qa = null), (Ea = 0), (Oe & 6) !== 0))
        throw Error(c(331));
      var y = Oe;
      if (
        ((Oe |= 4),
        Jd(s.current),
        Qd(s, s.current, o, a),
        (Oe = y),
        ni(0, !1),
        wt && typeof wt.onPostCommitFiberRoot == 'function')
      )
        try {
          wt.onPostCommitFiberRoot(Sl, s);
        } catch {}
      return !0;
    } finally {
      ((q.p = i), (z.T = n), dh(e, t));
    }
  }
  function mh(e, t, a) {
    ((t = Bt(a, t)),
      (t = Eu(e.stateNode, t, 2)),
      (e = Ba(e, t, 2)),
      e !== null && (Tl(e, 2), Pt(e)));
  }
  function Me(e, t, a) {
    if (e.tag === 3) mh(e, e, a);
    else
      for (; t !== null; ) {
        if (t.tag === 3) {
          mh(t, e, a);
          break;
        } else if (t.tag === 1) {
          var n = t.stateNode;
          if (
            typeof t.type.getDerivedStateFromError == 'function' ||
            (typeof n.componentDidCatch == 'function' &&
              (Za === null || !Za.has(n)))
          ) {
            ((e = Bt(a, e)),
              (a = yd(2)),
              (n = Ba(t, a, 2)),
              n !== null && (pd(a, n, t, e), Tl(n, 2), Pt(n)));
            break;
          }
        }
        t = t.return;
      }
  }
  function Ku(e, t, a) {
    var n = e.pingCache;
    if (n === null) {
      n = e.pingCache = new Og();
      var i = new Set();
      n.set(t, i);
    } else ((i = n.get(t)), i === void 0 && ((i = new Set()), n.set(t, i)));
    i.has(a) ||
      ((qu = !0), i.add(a), (e = kg.bind(null, e, t, a)), t.then(e, e));
  }
  function kg(e, t, a) {
    var n = e.pingCache;
    (n !== null && n.delete(t),
      (e.pingedLanes |= e.suspendedLanes & a),
      (e.warmLanes &= ~a),
      qe === e &&
        (we & a) === a &&
        ($e === 4 || ($e === 3 && (we & 62914560) === we && 300 > At() - ms)
          ? (Oe & 2) === 0 && ol(e, 0)
          : (Lu |= a),
        ul === we && (ul = 0)),
      Pt(e));
  }
  function yh(e, t) {
    (t === 0 && (t = ro()), (e = hn(e, t)), e !== null && (Tl(e, t), Pt(e)));
  }
  function Hg(e) {
    var t = e.memoizedState,
      a = 0;
    (t !== null && (a = t.retryLane), yh(e, a));
  }
  function Bg(e, t) {
    var a = 0;
    switch (e.tag) {
      case 31:
      case 13:
        var n = e.stateNode,
          i = e.memoizedState;
        i !== null && (a = i.retryLane);
        break;
      case 19:
        n = e.stateNode;
        break;
      case 22:
        n = e.stateNode._retryCache;
        break;
      default:
        throw Error(c(314));
    }
    (n !== null && n.delete(t), yh(e, a));
  }
  function qg(e, t) {
    return sr(e, t);
  }
  var Ss = null,
    dl = null,
    Ju = !1,
    Es = !1,
    $u = !1,
    Ka = 0;
  function Pt(e) {
    (e !== dl &&
      e.next === null &&
      (dl === null ? (Ss = dl = e) : (dl = dl.next = e)),
      (Es = !0),
      Ju || ((Ju = !0), Yg()));
  }
  function ni(e, t) {
    if (!$u && Es) {
      $u = !0;
      do
        for (var a = !1, n = Ss; n !== null; ) {
          if (e !== 0) {
            var i = n.pendingLanes;
            if (i === 0) var s = 0;
            else {
              var o = n.suspendedLanes,
                y = n.pingedLanes;
              ((s = (1 << (31 - jt(42 | e) + 1)) - 1),
                (s &= i & ~(o & ~y)),
                (s = s & 201326741 ? (s & 201326741) | 1 : s ? s | 2 : 0));
            }
            s !== 0 && ((a = !0), vh(n, s));
          } else
            ((s = we),
              (s = ji(
                n,
                n === qe ? s : 0,
                n.cancelPendingCommit !== null || n.timeoutHandle !== -1,
              )),
              (s & 3) === 0 || El(n, s) || ((a = !0), vh(n, s)));
          n = n.next;
        }
      while (a);
      $u = !1;
    }
  }
  function Lg() {
    ph();
  }
  function ph() {
    Es = Ju = !1;
    var e = 0;
    Ka !== 0 && Fg() && (e = Ka);
    for (var t = At(), a = null, n = Ss; n !== null; ) {
      var i = n.next,
        s = gh(n, t);
      (s === 0
        ? ((n.next = null),
          a === null ? (Ss = i) : (a.next = i),
          i === null && (dl = a))
        : ((a = n), (e !== 0 || (s & 3) !== 0) && (Es = !0)),
        (n = i));
    }
    ((nt !== 0 && nt !== 5) || ni(e), Ka !== 0 && (Ka = 0));
  }
  function gh(e, t) {
    for (
      var a = e.suspendedLanes,
        n = e.pingedLanes,
        i = e.expirationTimes,
        s = e.pendingLanes & -62914561;
      0 < s;
    ) {
      var o = 31 - jt(s),
        y = 1 << o,
        T = i[o];
      (T === -1
        ? ((y & a) === 0 || (y & n) !== 0) && (i[o] = hp(y, t))
        : T <= t && (e.expiredLanes |= y),
        (s &= ~y));
    }
    if (
      ((t = qe),
      (a = we),
      (a = ji(
        e,
        e === t ? a : 0,
        e.cancelPendingCommit !== null || e.timeoutHandle !== -1,
      )),
      (n = e.callbackNode),
      a === 0 ||
        (e === t && (Ce === 2 || Ce === 9)) ||
        e.cancelPendingCommit !== null)
    )
      return (
        n !== null && n !== null && rr(n),
        (e.callbackNode = null),
        (e.callbackPriority = 0)
      );
    if ((a & 3) === 0 || El(e, a)) {
      if (((t = a & -a), t === e.callbackPriority)) return t;
      switch ((n !== null && rr(n), or(a))) {
        case 2:
        case 8:
          a = io;
          break;
        case 32:
          a = Ei;
          break;
        case 268435456:
          a = so;
          break;
        default:
          a = Ei;
      }
      return (
        (n = bh.bind(null, e)),
        (a = sr(a, n)),
        (e.callbackPriority = t),
        (e.callbackNode = a),
        t
      );
    }
    return (
      n !== null && n !== null && rr(n),
      (e.callbackPriority = 2),
      (e.callbackNode = null),
      2
    );
  }
  function bh(e, t) {
    if (nt !== 0 && nt !== 5)
      return ((e.callbackNode = null), (e.callbackPriority = 0), null);
    var a = e.callbackNode;
    if (xs() && e.callbackNode !== a) return null;
    var n = we;
    return (
      (n = ji(
        e,
        e === qe ? n : 0,
        e.cancelPendingCommit !== null || e.timeoutHandle !== -1,
      )),
      n === 0
        ? null
        : (Pd(e, n, t),
          gh(e, At()),
          e.callbackNode != null && e.callbackNode === a
            ? bh.bind(null, e)
            : null)
    );
  }
  function vh(e, t) {
    if (xs()) return null;
    Pd(e, t, !0);
  }
  function Yg() {
    Pg(function () {
      (Oe & 6) !== 0 ? sr(lo, Lg) : ph();
    });
  }
  function Wu() {
    if (Ka === 0) {
      var e = Fn;
      (e === 0 && ((e = Ti), (Ti <<= 1), (Ti & 261888) === 0 && (Ti = 256)),
        (Ka = e));
    }
    return Ka;
  }
  function xh(e) {
    return e == null || typeof e == 'symbol' || typeof e == 'boolean'
      ? null
      : typeof e == 'function'
        ? e
        : _i('' + e);
  }
  function Sh(e, t) {
    var a = t.ownerDocument.createElement('input');
    return (
      (a.name = t.name),
      (a.value = t.value),
      e.id && a.setAttribute('form', e.id),
      t.parentNode.insertBefore(a, t),
      (e = new FormData(e)),
      a.parentNode.removeChild(a),
      e
    );
  }
  function Gg(e, t, a, n, i) {
    if (t === 'submit' && a && a.stateNode === i) {
      var s = xh((i[gt] || null).action),
        o = n.submitter;
      o &&
        ((t = (t = o[gt] || null)
          ? xh(t.formAction)
          : o.getAttribute('formAction')),
        t !== null && ((s = t), (o = null)));
      var y = new Di('action', 'action', null, n, i);
      e.push({
        event: y,
        listeners: [
          {
            instance: null,
            listener: function () {
              if (n.defaultPrevented) {
                if (Ka !== 0) {
                  var T = o ? Sh(i, o) : new FormData(i);
                  pu(
                    a,
                    { pending: !0, data: T, method: i.method, action: s },
                    null,
                    T,
                  );
                }
              } else
                typeof s == 'function' &&
                  (y.preventDefault(),
                  (T = o ? Sh(i, o) : new FormData(i)),
                  pu(
                    a,
                    { pending: !0, data: T, method: i.method, action: s },
                    s,
                    T,
                  ));
            },
            currentTarget: i,
          },
        ],
      });
    }
  }
  for (var Fu = 0; Fu < Mr.length; Fu++) {
    var Iu = Mr[Fu],
      Xg = Iu.toLowerCase(),
      Zg = Iu[0].toUpperCase() + Iu.slice(1);
    Vt(Xg, 'on' + Zg);
  }
  (Vt(Fo, 'onAnimationEnd'),
    Vt(Io, 'onAnimationIteration'),
    Vt(Po, 'onAnimationStart'),
    Vt('dblclick', 'onDoubleClick'),
    Vt('focusin', 'onFocus'),
    Vt('focusout', 'onBlur'),
    Vt(sg, 'onTransitionRun'),
    Vt(rg, 'onTransitionStart'),
    Vt(ug, 'onTransitionCancel'),
    Vt(ef, 'onTransitionEnd'),
    Hn('onMouseEnter', ['mouseout', 'mouseover']),
    Hn('onMouseLeave', ['mouseout', 'mouseover']),
    Hn('onPointerEnter', ['pointerout', 'pointerover']),
    Hn('onPointerLeave', ['pointerout', 'pointerover']),
    cn(
      'onChange',
      'change click focusin focusout input keydown keyup selectionchange'.split(
        ' ',
      ),
    ),
    cn(
      'onSelect',
      'focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange'.split(
        ' ',
      ),
    ),
    cn('onBeforeInput', ['compositionend', 'keypress', 'textInput', 'paste']),
    cn(
      'onCompositionEnd',
      'compositionend focusout keydown keypress keyup mousedown'.split(' '),
    ),
    cn(
      'onCompositionStart',
      'compositionstart focusout keydown keypress keyup mousedown'.split(' '),
    ),
    cn(
      'onCompositionUpdate',
      'compositionupdate focusout keydown keypress keyup mousedown'.split(' '),
    ));
  var li =
      'abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting'.split(
        ' ',
      ),
    Qg = new Set(
      'beforetoggle cancel close invalid load scroll scrollend toggle'
        .split(' ')
        .concat(li),
    );
  function Eh(e, t) {
    t = (t & 4) !== 0;
    for (var a = 0; a < e.length; a++) {
      var n = e[a],
        i = n.event;
      n = n.listeners;
      e: {
        var s = void 0;
        if (t)
          for (var o = n.length - 1; 0 <= o; o--) {
            var y = n[o],
              T = y.instance,
              C = y.currentTarget;
            if (((y = y.listener), T !== s && i.isPropagationStopped()))
              break e;
            ((s = y), (i.currentTarget = C));
            try {
              s(i);
            } catch (H) {
              Hi(H);
            }
            ((i.currentTarget = null), (s = T));
          }
        else
          for (o = 0; o < n.length; o++) {
            if (
              ((y = n[o]),
              (T = y.instance),
              (C = y.currentTarget),
              (y = y.listener),
              T !== s && i.isPropagationStopped())
            )
              break e;
            ((s = y), (i.currentTarget = C));
            try {
              s(i);
            } catch (H) {
              Hi(H);
            }
            ((i.currentTarget = null), (s = T));
          }
      }
    }
  }
  function Ae(e, t) {
    var a = t[fr];
    a === void 0 && (a = t[fr] = new Set());
    var n = e + '__bubble';
    a.has(n) || (Th(t, e, 2, !1), a.add(n));
  }
  function Pu(e, t, a) {
    var n = 0;
    (t && (n |= 4), Th(a, e, n, t));
  }
  var Ts = '_reactListening' + Math.random().toString(36).slice(2);
  function ec(e) {
    if (!e[Ts]) {
      ((e[Ts] = !0),
        yo.forEach(function (a) {
          a !== 'selectionchange' && (Qg.has(a) || Pu(a, !1, e), Pu(a, !0, e));
        }));
      var t = e.nodeType === 9 ? e : e.ownerDocument;
      t === null || t[Ts] || ((t[Ts] = !0), Pu('selectionchange', !1, t));
    }
  }
  function Th(e, t, a, n) {
    switch (Ih(t)) {
      case 2:
        var i = vb;
        break;
      case 8:
        i = xb;
        break;
      default:
        i = yc;
    }
    ((a = i.bind(null, t, a, e)),
      (i = void 0),
      !xr ||
        (t !== 'touchstart' && t !== 'touchmove' && t !== 'wheel') ||
        (i = !0),
      n
        ? i !== void 0
          ? e.addEventListener(t, a, { capture: !0, passive: i })
          : e.addEventListener(t, a, !0)
        : i !== void 0
          ? e.addEventListener(t, a, { passive: i })
          : e.addEventListener(t, a, !1));
  }
  function tc(e, t, a, n, i) {
    var s = n;
    if ((t & 1) === 0 && (t & 2) === 0 && n !== null)
      e: for (;;) {
        if (n === null) return;
        var o = n.tag;
        if (o === 3 || o === 4) {
          var y = n.stateNode.containerInfo;
          if (y === i) break;
          if (o === 4)
            for (o = n.return; o !== null; ) {
              var T = o.tag;
              if ((T === 3 || T === 4) && o.stateNode.containerInfo === i)
                return;
              o = o.return;
            }
          for (; y !== null; ) {
            if (((o = Dn(y)), o === null)) return;
            if (((T = o.tag), T === 5 || T === 6 || T === 26 || T === 27)) {
              n = s = o;
              continue e;
            }
            y = y.parentNode;
          }
        }
        n = n.return;
      }
    No(function () {
      var C = s,
        H = br(a),
        X = [];
      e: {
        var M = tf.get(e);
        if (M !== void 0) {
          var U = Di,
            ie = e;
          switch (e) {
            case 'keypress':
              if (Ci(a) === 0) break e;
            case 'keydown':
            case 'keyup':
              U = Bp;
              break;
            case 'focusin':
              ((ie = 'focus'), (U = Ar));
              break;
            case 'focusout':
              ((ie = 'blur'), (U = Ar));
              break;
            case 'beforeblur':
            case 'afterblur':
              U = Ar;
              break;
            case 'click':
              if (a.button === 2) break e;
            case 'auxclick':
            case 'dblclick':
            case 'mousedown':
            case 'mousemove':
            case 'mouseup':
            case 'mouseout':
            case 'mouseover':
            case 'contextmenu':
              U = _o;
              break;
            case 'drag':
            case 'dragend':
            case 'dragenter':
            case 'dragexit':
            case 'dragleave':
            case 'dragover':
            case 'dragstart':
            case 'drop':
              U = jp;
              break;
            case 'touchcancel':
            case 'touchend':
            case 'touchmove':
            case 'touchstart':
              U = Yp;
              break;
            case Fo:
            case Io:
            case Po:
              U = zp;
              break;
            case ef:
              U = Xp;
              break;
            case 'scroll':
            case 'scrollend':
              U = Ap;
              break;
            case 'wheel':
              U = Qp;
              break;
            case 'copy':
            case 'cut':
            case 'paste':
              U = Op;
              break;
            case 'gotpointercapture':
            case 'lostpointercapture':
            case 'pointercancel':
            case 'pointerdown':
            case 'pointermove':
            case 'pointerout':
            case 'pointerover':
            case 'pointerup':
              U = Co;
              break;
            case 'toggle':
            case 'beforetoggle':
              U = Kp;
          }
          var me = (t & 4) !== 0,
            He = !me && (e === 'scroll' || e === 'scrollend'),
            R = me ? (M !== null ? M + 'Capture' : null) : M;
          me = [];
          for (var j = C, O; j !== null; ) {
            var L = j;
            if (
              ((O = L.stateNode),
              (L = L.tag),
              (L !== 5 && L !== 26 && L !== 27) ||
                O === null ||
                R === null ||
                ((L = jl(j, R)), L != null && me.push(ii(j, L, O))),
              He)
            )
              break;
            j = j.return;
          }
          0 < me.length &&
            ((M = new U(M, ie, null, a, H)),
            X.push({ event: M, listeners: me }));
        }
      }
      if ((t & 7) === 0) {
        e: {
          if (
            ((M = e === 'mouseover' || e === 'pointerover'),
            (U = e === 'mouseout' || e === 'pointerout'),
            M &&
              a !== gr &&
              (ie = a.relatedTarget || a.fromElement) &&
              (Dn(ie) || ie[Mn]))
          )
            break e;
          if (
            (U || M) &&
            ((M =
              H.window === H
                ? H
                : (M = H.ownerDocument)
                  ? M.defaultView || M.parentWindow
                  : window),
            U
              ? ((ie = a.relatedTarget || a.toElement),
                (U = C),
                (ie = ie ? Dn(ie) : null),
                ie !== null &&
                  ((He = d(ie)),
                  (me = ie.tag),
                  ie !== He || (me !== 5 && me !== 27 && me !== 6)) &&
                  (ie = null))
              : ((U = null), (ie = C)),
            U !== ie)
          ) {
            if (
              ((me = _o),
              (L = 'onMouseLeave'),
              (R = 'onMouseEnter'),
              (j = 'mouse'),
              (e === 'pointerout' || e === 'pointerover') &&
                ((me = Co),
                (L = 'onPointerLeave'),
                (R = 'onPointerEnter'),
                (j = 'pointer')),
              (He = U == null ? M : wl(U)),
              (O = ie == null ? M : wl(ie)),
              (M = new me(L, j + 'leave', U, a, H)),
              (M.target = He),
              (M.relatedTarget = O),
              (L = null),
              Dn(H) === C &&
                ((me = new me(R, j + 'enter', ie, a, H)),
                (me.target = O),
                (me.relatedTarget = He),
                (L = me)),
              (He = L),
              U && ie)
            )
              t: {
                for (me = Vg, R = U, j = ie, O = 0, L = R; L; L = me(L)) O++;
                L = 0;
                for (var de = j; de; de = me(de)) L++;
                for (; 0 < O - L; ) ((R = me(R)), O--);
                for (; 0 < L - O; ) ((j = me(j)), L--);
                for (; O--; ) {
                  if (R === j || (j !== null && R === j.alternate)) {
                    me = R;
                    break t;
                  }
                  ((R = me(R)), (j = me(j)));
                }
                me = null;
              }
            else me = null;
            (U !== null && Ah(X, M, U, me, !1),
              ie !== null && He !== null && Ah(X, He, ie, me, !0));
          }
        }
        e: {
          if (
            ((M = C ? wl(C) : window),
            (U = M.nodeName && M.nodeName.toLowerCase()),
            U === 'select' || (U === 'input' && M.type === 'file'))
          )
            var ze = Lo;
          else if (Bo(M))
            if (Yo) ze = ng;
            else {
              ze = tg;
              var oe = eg;
            }
          else
            ((U = M.nodeName),
              !U ||
              U.toLowerCase() !== 'input' ||
              (M.type !== 'checkbox' && M.type !== 'radio')
                ? C && pr(C.elementType) && (ze = Lo)
                : (ze = ag));
          if (ze && (ze = ze(e, C))) {
            qo(X, ze, a, H);
            break e;
          }
          (oe && oe(e, M, C),
            e === 'focusout' &&
              C &&
              M.type === 'number' &&
              C.memoizedProps.value != null &&
              yr(M, 'number', M.value));
        }
        switch (((oe = C ? wl(C) : window), e)) {
          case 'focusin':
            (Bo(oe) || oe.contentEditable === 'true') &&
              ((Xn = oe), (_r = C), (Dl = null));
            break;
          case 'focusout':
            Dl = _r = Xn = null;
            break;
          case 'mousedown':
            Or = !0;
            break;
          case 'contextmenu':
          case 'mouseup':
          case 'dragend':
            ((Or = !1), $o(X, a, H));
            break;
          case 'selectionchange':
            if (ig) break;
          case 'keydown':
          case 'keyup':
            $o(X, a, H);
        }
        var ve;
        if (jr)
          e: {
            switch (e) {
              case 'compositionstart':
                var je = 'onCompositionStart';
                break e;
              case 'compositionend':
                je = 'onCompositionEnd';
                break e;
              case 'compositionupdate':
                je = 'onCompositionUpdate';
                break e;
            }
            je = void 0;
          }
        else
          Gn
            ? ko(e, a) && (je = 'onCompositionEnd')
            : e === 'keydown' &&
              a.keyCode === 229 &&
              (je = 'onCompositionStart');
        (je &&
          (Mo &&
            a.locale !== 'ko' &&
            (Gn || je !== 'onCompositionStart'
              ? je === 'onCompositionEnd' && Gn && (ve = Ro())
              : ((Oa = H),
                (Sr = 'value' in Oa ? Oa.value : Oa.textContent),
                (Gn = !0))),
          (oe = As(C, je)),
          0 < oe.length &&
            ((je = new Oo(je, e, null, a, H)),
            X.push({ event: je, listeners: oe }),
            ve
              ? (je.data = ve)
              : ((ve = Ho(a)), ve !== null && (je.data = ve)))),
          (ve = $p ? Wp(e, a) : Fp(e, a)) &&
            ((je = As(C, 'onBeforeInput')),
            0 < je.length &&
              ((oe = new Oo('onBeforeInput', 'beforeinput', null, a, H)),
              X.push({ event: oe, listeners: je }),
              (oe.data = ve))),
          Gg(X, e, C, a, H));
      }
      Eh(X, t);
    });
  }
  function ii(e, t, a) {
    return { instance: e, listener: t, currentTarget: a };
  }
  function As(e, t) {
    for (var a = t + 'Capture', n = []; e !== null; ) {
      var i = e,
        s = i.stateNode;
      if (
        ((i = i.tag),
        (i !== 5 && i !== 26 && i !== 27) ||
          s === null ||
          ((i = jl(e, a)),
          i != null && n.unshift(ii(e, i, s)),
          (i = jl(e, t)),
          i != null && n.push(ii(e, i, s))),
        e.tag === 3)
      )
        return n;
      e = e.return;
    }
    return [];
  }
  function Vg(e) {
    if (e === null) return null;
    do e = e.return;
    while (e && e.tag !== 5 && e.tag !== 27);
    return e || null;
  }
  function Ah(e, t, a, n, i) {
    for (var s = t._reactName, o = []; a !== null && a !== n; ) {
      var y = a,
        T = y.alternate,
        C = y.stateNode;
      if (((y = y.tag), T !== null && T === n)) break;
      ((y !== 5 && y !== 26 && y !== 27) ||
        C === null ||
        ((T = C),
        i
          ? ((C = jl(a, s)), C != null && o.unshift(ii(a, C, T)))
          : i || ((C = jl(a, s)), C != null && o.push(ii(a, C, T)))),
        (a = a.return));
    }
    o.length !== 0 && e.push({ event: t, listeners: o });
  }
  var Kg = /\r\n?/g,
    Jg = /\u0000|\uFFFD/g;
  function wh(e) {
    return (typeof e == 'string' ? e : '' + e)
      .replace(
        Kg,
        `
`,
      )
      .replace(Jg, '');
  }
  function jh(e, t) {
    return ((t = wh(t)), wh(e) === t);
  }
  function ke(e, t, a, n, i, s) {
    switch (a) {
      case 'children':
        typeof n == 'string'
          ? t === 'body' || (t === 'textarea' && n === '') || qn(e, n)
          : (typeof n == 'number' || typeof n == 'bigint') &&
            t !== 'body' &&
            qn(e, '' + n);
        break;
      case 'className':
        Ri(e, 'class', n);
        break;
      case 'tabIndex':
        Ri(e, 'tabindex', n);
        break;
      case 'dir':
      case 'role':
      case 'viewBox':
      case 'width':
      case 'height':
        Ri(e, a, n);
        break;
      case 'style':
        wo(e, n, s);
        break;
      case 'data':
        if (t !== 'object') {
          Ri(e, 'data', n);
          break;
        }
      case 'src':
      case 'href':
        if (n === '' && (t !== 'a' || a !== 'href')) {
          e.removeAttribute(a);
          break;
        }
        if (
          n == null ||
          typeof n == 'function' ||
          typeof n == 'symbol' ||
          typeof n == 'boolean'
        ) {
          e.removeAttribute(a);
          break;
        }
        ((n = _i('' + n)), e.setAttribute(a, n));
        break;
      case 'action':
      case 'formAction':
        if (typeof n == 'function') {
          e.setAttribute(
            a,
            "javascript:throw new Error('A React form was unexpectedly submitted. If you called form.submit() manually, consider using form.requestSubmit() instead. If you\\'re trying to use event.stopPropagation() in a submit event handler, consider also calling event.preventDefault().')",
          );
          break;
        } else
          typeof s == 'function' &&
            (a === 'formAction'
              ? (t !== 'input' && ke(e, t, 'name', i.name, i, null),
                ke(e, t, 'formEncType', i.formEncType, i, null),
                ke(e, t, 'formMethod', i.formMethod, i, null),
                ke(e, t, 'formTarget', i.formTarget, i, null))
              : (ke(e, t, 'encType', i.encType, i, null),
                ke(e, t, 'method', i.method, i, null),
                ke(e, t, 'target', i.target, i, null)));
        if (n == null || typeof n == 'symbol' || typeof n == 'boolean') {
          e.removeAttribute(a);
          break;
        }
        ((n = _i('' + n)), e.setAttribute(a, n));
        break;
      case 'onClick':
        n != null && (e.onclick = ra);
        break;
      case 'onScroll':
        n != null && Ae('scroll', e);
        break;
      case 'onScrollEnd':
        n != null && Ae('scrollend', e);
        break;
      case 'dangerouslySetInnerHTML':
        if (n != null) {
          if (typeof n != 'object' || !('__html' in n)) throw Error(c(61));
          if (((a = n.__html), a != null)) {
            if (i.children != null) throw Error(c(60));
            e.innerHTML = a;
          }
        }
        break;
      case 'multiple':
        e.multiple = n && typeof n != 'function' && typeof n != 'symbol';
        break;
      case 'muted':
        e.muted = n && typeof n != 'function' && typeof n != 'symbol';
        break;
      case 'suppressContentEditableWarning':
      case 'suppressHydrationWarning':
      case 'defaultValue':
      case 'defaultChecked':
      case 'innerHTML':
      case 'ref':
        break;
      case 'autoFocus':
        break;
      case 'xlinkHref':
        if (
          n == null ||
          typeof n == 'function' ||
          typeof n == 'boolean' ||
          typeof n == 'symbol'
        ) {
          e.removeAttribute('xlink:href');
          break;
        }
        ((a = _i('' + n)),
          e.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', a));
        break;
      case 'contentEditable':
      case 'spellCheck':
      case 'draggable':
      case 'value':
      case 'autoReverse':
      case 'externalResourcesRequired':
      case 'focusable':
      case 'preserveAlpha':
        n != null && typeof n != 'function' && typeof n != 'symbol'
          ? e.setAttribute(a, '' + n)
          : e.removeAttribute(a);
        break;
      case 'inert':
      case 'allowFullScreen':
      case 'async':
      case 'autoPlay':
      case 'controls':
      case 'default':
      case 'defer':
      case 'disabled':
      case 'disablePictureInPicture':
      case 'disableRemotePlayback':
      case 'formNoValidate':
      case 'hidden':
      case 'loop':
      case 'noModule':
      case 'noValidate':
      case 'open':
      case 'playsInline':
      case 'readOnly':
      case 'required':
      case 'reversed':
      case 'scoped':
      case 'seamless':
      case 'itemScope':
        n && typeof n != 'function' && typeof n != 'symbol'
          ? e.setAttribute(a, '')
          : e.removeAttribute(a);
        break;
      case 'capture':
      case 'download':
        n === !0
          ? e.setAttribute(a, '')
          : n !== !1 &&
              n != null &&
              typeof n != 'function' &&
              typeof n != 'symbol'
            ? e.setAttribute(a, n)
            : e.removeAttribute(a);
        break;
      case 'cols':
      case 'rows':
      case 'size':
      case 'span':
        n != null &&
        typeof n != 'function' &&
        typeof n != 'symbol' &&
        !isNaN(n) &&
        1 <= n
          ? e.setAttribute(a, n)
          : e.removeAttribute(a);
        break;
      case 'rowSpan':
      case 'start':
        n == null || typeof n == 'function' || typeof n == 'symbol' || isNaN(n)
          ? e.removeAttribute(a)
          : e.setAttribute(a, n);
        break;
      case 'popover':
        (Ae('beforetoggle', e), Ae('toggle', e), Ni(e, 'popover', n));
        break;
      case 'xlinkActuate':
        sa(e, 'http://www.w3.org/1999/xlink', 'xlink:actuate', n);
        break;
      case 'xlinkArcrole':
        sa(e, 'http://www.w3.org/1999/xlink', 'xlink:arcrole', n);
        break;
      case 'xlinkRole':
        sa(e, 'http://www.w3.org/1999/xlink', 'xlink:role', n);
        break;
      case 'xlinkShow':
        sa(e, 'http://www.w3.org/1999/xlink', 'xlink:show', n);
        break;
      case 'xlinkTitle':
        sa(e, 'http://www.w3.org/1999/xlink', 'xlink:title', n);
        break;
      case 'xlinkType':
        sa(e, 'http://www.w3.org/1999/xlink', 'xlink:type', n);
        break;
      case 'xmlBase':
        sa(e, 'http://www.w3.org/XML/1998/namespace', 'xml:base', n);
        break;
      case 'xmlLang':
        sa(e, 'http://www.w3.org/XML/1998/namespace', 'xml:lang', n);
        break;
      case 'xmlSpace':
        sa(e, 'http://www.w3.org/XML/1998/namespace', 'xml:space', n);
        break;
      case 'is':
        Ni(e, 'is', n);
        break;
      case 'innerText':
      case 'textContent':
        break;
      default:
        (!(2 < a.length) ||
          (a[0] !== 'o' && a[0] !== 'O') ||
          (a[1] !== 'n' && a[1] !== 'N')) &&
          ((a = Ep.get(a) || a), Ni(e, a, n));
    }
  }
  function ac(e, t, a, n, i, s) {
    switch (a) {
      case 'style':
        wo(e, n, s);
        break;
      case 'dangerouslySetInnerHTML':
        if (n != null) {
          if (typeof n != 'object' || !('__html' in n)) throw Error(c(61));
          if (((a = n.__html), a != null)) {
            if (i.children != null) throw Error(c(60));
            e.innerHTML = a;
          }
        }
        break;
      case 'children':
        typeof n == 'string'
          ? qn(e, n)
          : (typeof n == 'number' || typeof n == 'bigint') && qn(e, '' + n);
        break;
      case 'onScroll':
        n != null && Ae('scroll', e);
        break;
      case 'onScrollEnd':
        n != null && Ae('scrollend', e);
        break;
      case 'onClick':
        n != null && (e.onclick = ra);
        break;
      case 'suppressContentEditableWarning':
      case 'suppressHydrationWarning':
      case 'innerHTML':
      case 'ref':
        break;
      case 'innerText':
      case 'textContent':
        break;
      default:
        if (!po.hasOwnProperty(a))
          e: {
            if (
              a[0] === 'o' &&
              a[1] === 'n' &&
              ((i = a.endsWith('Capture')),
              (t = a.slice(2, i ? a.length - 7 : void 0)),
              (s = e[gt] || null),
              (s = s != null ? s[a] : null),
              typeof s == 'function' && e.removeEventListener(t, s, i),
              typeof n == 'function')
            ) {
              (typeof s != 'function' &&
                s !== null &&
                (a in e
                  ? (e[a] = null)
                  : e.hasAttribute(a) && e.removeAttribute(a)),
                e.addEventListener(t, n, i));
              break e;
            }
            a in e
              ? (e[a] = n)
              : n === !0
                ? e.setAttribute(a, '')
                : Ni(e, a, n);
          }
    }
  }
  function ht(e, t, a) {
    switch (t) {
      case 'div':
      case 'span':
      case 'svg':
      case 'path':
      case 'a':
      case 'g':
      case 'p':
      case 'li':
        break;
      case 'img':
        (Ae('error', e), Ae('load', e));
        var n = !1,
          i = !1,
          s;
        for (s in a)
          if (a.hasOwnProperty(s)) {
            var o = a[s];
            if (o != null)
              switch (s) {
                case 'src':
                  n = !0;
                  break;
                case 'srcSet':
                  i = !0;
                  break;
                case 'children':
                case 'dangerouslySetInnerHTML':
                  throw Error(c(137, t));
                default:
                  ke(e, t, s, o, a, null);
              }
          }
        (i && ke(e, t, 'srcSet', a.srcSet, a, null),
          n && ke(e, t, 'src', a.src, a, null));
        return;
      case 'input':
        Ae('invalid', e);
        var y = (s = o = i = null),
          T = null,
          C = null;
        for (n in a)
          if (a.hasOwnProperty(n)) {
            var H = a[n];
            if (H != null)
              switch (n) {
                case 'name':
                  i = H;
                  break;
                case 'type':
                  o = H;
                  break;
                case 'checked':
                  T = H;
                  break;
                case 'defaultChecked':
                  C = H;
                  break;
                case 'value':
                  s = H;
                  break;
                case 'defaultValue':
                  y = H;
                  break;
                case 'children':
                case 'dangerouslySetInnerHTML':
                  if (H != null) throw Error(c(137, t));
                  break;
                default:
                  ke(e, t, n, H, a, null);
              }
          }
        So(e, s, y, T, C, o, i, !1);
        return;
      case 'select':
        (Ae('invalid', e), (n = o = s = null));
        for (i in a)
          if (a.hasOwnProperty(i) && ((y = a[i]), y != null))
            switch (i) {
              case 'value':
                s = y;
                break;
              case 'defaultValue':
                o = y;
                break;
              case 'multiple':
                n = y;
              default:
                ke(e, t, i, y, a, null);
            }
        ((t = s),
          (a = o),
          (e.multiple = !!n),
          t != null ? Bn(e, !!n, t, !1) : a != null && Bn(e, !!n, a, !0));
        return;
      case 'textarea':
        (Ae('invalid', e), (s = i = n = null));
        for (o in a)
          if (a.hasOwnProperty(o) && ((y = a[o]), y != null))
            switch (o) {
              case 'value':
                n = y;
                break;
              case 'defaultValue':
                i = y;
                break;
              case 'children':
                s = y;
                break;
              case 'dangerouslySetInnerHTML':
                if (y != null) throw Error(c(91));
                break;
              default:
                ke(e, t, o, y, a, null);
            }
        To(e, n, i, s);
        return;
      case 'option':
        for (T in a)
          if (a.hasOwnProperty(T) && ((n = a[T]), n != null))
            switch (T) {
              case 'selected':
                e.selected =
                  n && typeof n != 'function' && typeof n != 'symbol';
                break;
              default:
                ke(e, t, T, n, a, null);
            }
        return;
      case 'dialog':
        (Ae('beforetoggle', e),
          Ae('toggle', e),
          Ae('cancel', e),
          Ae('close', e));
        break;
      case 'iframe':
      case 'object':
        Ae('load', e);
        break;
      case 'video':
      case 'audio':
        for (n = 0; n < li.length; n++) Ae(li[n], e);
        break;
      case 'image':
        (Ae('error', e), Ae('load', e));
        break;
      case 'details':
        Ae('toggle', e);
        break;
      case 'embed':
      case 'source':
      case 'link':
        (Ae('error', e), Ae('load', e));
      case 'area':
      case 'base':
      case 'br':
      case 'col':
      case 'hr':
      case 'keygen':
      case 'meta':
      case 'param':
      case 'track':
      case 'wbr':
      case 'menuitem':
        for (C in a)
          if (a.hasOwnProperty(C) && ((n = a[C]), n != null))
            switch (C) {
              case 'children':
              case 'dangerouslySetInnerHTML':
                throw Error(c(137, t));
              default:
                ke(e, t, C, n, a, null);
            }
        return;
      default:
        if (pr(t)) {
          for (H in a)
            a.hasOwnProperty(H) &&
              ((n = a[H]), n !== void 0 && ac(e, t, H, n, a, void 0));
          return;
        }
    }
    for (y in a)
      a.hasOwnProperty(y) && ((n = a[y]), n != null && ke(e, t, y, n, a, null));
  }
  function $g(e, t, a, n) {
    switch (t) {
      case 'div':
      case 'span':
      case 'svg':
      case 'path':
      case 'a':
      case 'g':
      case 'p':
      case 'li':
        break;
      case 'input':
        var i = null,
          s = null,
          o = null,
          y = null,
          T = null,
          C = null,
          H = null;
        for (U in a) {
          var X = a[U];
          if (a.hasOwnProperty(U) && X != null)
            switch (U) {
              case 'checked':
                break;
              case 'value':
                break;
              case 'defaultValue':
                T = X;
              default:
                n.hasOwnProperty(U) || ke(e, t, U, null, n, X);
            }
        }
        for (var M in n) {
          var U = n[M];
          if (((X = a[M]), n.hasOwnProperty(M) && (U != null || X != null)))
            switch (M) {
              case 'type':
                s = U;
                break;
              case 'name':
                i = U;
                break;
              case 'checked':
                C = U;
                break;
              case 'defaultChecked':
                H = U;
                break;
              case 'value':
                o = U;
                break;
              case 'defaultValue':
                y = U;
                break;
              case 'children':
              case 'dangerouslySetInnerHTML':
                if (U != null) throw Error(c(137, t));
                break;
              default:
                U !== X && ke(e, t, M, U, n, X);
            }
        }
        mr(e, o, y, T, C, H, s, i);
        return;
      case 'select':
        U = o = y = M = null;
        for (s in a)
          if (((T = a[s]), a.hasOwnProperty(s) && T != null))
            switch (s) {
              case 'value':
                break;
              case 'multiple':
                U = T;
              default:
                n.hasOwnProperty(s) || ke(e, t, s, null, n, T);
            }
        for (i in n)
          if (
            ((s = n[i]),
            (T = a[i]),
            n.hasOwnProperty(i) && (s != null || T != null))
          )
            switch (i) {
              case 'value':
                M = s;
                break;
              case 'defaultValue':
                y = s;
                break;
              case 'multiple':
                o = s;
              default:
                s !== T && ke(e, t, i, s, n, T);
            }
        ((t = y),
          (a = o),
          (n = U),
          M != null
            ? Bn(e, !!a, M, !1)
            : !!n != !!a &&
              (t != null ? Bn(e, !!a, t, !0) : Bn(e, !!a, a ? [] : '', !1)));
        return;
      case 'textarea':
        U = M = null;
        for (y in a)
          if (
            ((i = a[y]),
            a.hasOwnProperty(y) && i != null && !n.hasOwnProperty(y))
          )
            switch (y) {
              case 'value':
                break;
              case 'children':
                break;
              default:
                ke(e, t, y, null, n, i);
            }
        for (o in n)
          if (
            ((i = n[o]),
            (s = a[o]),
            n.hasOwnProperty(o) && (i != null || s != null))
          )
            switch (o) {
              case 'value':
                M = i;
                break;
              case 'defaultValue':
                U = i;
                break;
              case 'children':
                break;
              case 'dangerouslySetInnerHTML':
                if (i != null) throw Error(c(91));
                break;
              default:
                i !== s && ke(e, t, o, i, n, s);
            }
        Eo(e, M, U);
        return;
      case 'option':
        for (var ie in a)
          if (
            ((M = a[ie]),
            a.hasOwnProperty(ie) && M != null && !n.hasOwnProperty(ie))
          )
            switch (ie) {
              case 'selected':
                e.selected = !1;
                break;
              default:
                ke(e, t, ie, null, n, M);
            }
        for (T in n)
          if (
            ((M = n[T]),
            (U = a[T]),
            n.hasOwnProperty(T) && M !== U && (M != null || U != null))
          )
            switch (T) {
              case 'selected':
                e.selected =
                  M && typeof M != 'function' && typeof M != 'symbol';
                break;
              default:
                ke(e, t, T, M, n, U);
            }
        return;
      case 'img':
      case 'link':
      case 'area':
      case 'base':
      case 'br':
      case 'col':
      case 'embed':
      case 'hr':
      case 'keygen':
      case 'meta':
      case 'param':
      case 'source':
      case 'track':
      case 'wbr':
      case 'menuitem':
        for (var me in a)
          ((M = a[me]),
            a.hasOwnProperty(me) &&
              M != null &&
              !n.hasOwnProperty(me) &&
              ke(e, t, me, null, n, M));
        for (C in n)
          if (
            ((M = n[C]),
            (U = a[C]),
            n.hasOwnProperty(C) && M !== U && (M != null || U != null))
          )
            switch (C) {
              case 'children':
              case 'dangerouslySetInnerHTML':
                if (M != null) throw Error(c(137, t));
                break;
              default:
                ke(e, t, C, M, n, U);
            }
        return;
      default:
        if (pr(t)) {
          for (var He in a)
            ((M = a[He]),
              a.hasOwnProperty(He) &&
                M !== void 0 &&
                !n.hasOwnProperty(He) &&
                ac(e, t, He, void 0, n, M));
          for (H in n)
            ((M = n[H]),
              (U = a[H]),
              !n.hasOwnProperty(H) ||
                M === U ||
                (M === void 0 && U === void 0) ||
                ac(e, t, H, M, n, U));
          return;
        }
    }
    for (var R in a)
      ((M = a[R]),
        a.hasOwnProperty(R) &&
          M != null &&
          !n.hasOwnProperty(R) &&
          ke(e, t, R, null, n, M));
    for (X in n)
      ((M = n[X]),
        (U = a[X]),
        !n.hasOwnProperty(X) ||
          M === U ||
          (M == null && U == null) ||
          ke(e, t, X, M, n, U));
  }
  function Nh(e) {
    switch (e) {
      case 'css':
      case 'script':
      case 'font':
      case 'img':
      case 'image':
      case 'input':
      case 'link':
        return !0;
      default:
        return !1;
    }
  }
  function Wg() {
    if (typeof performance.getEntriesByType == 'function') {
      for (
        var e = 0, t = 0, a = performance.getEntriesByType('resource'), n = 0;
        n < a.length;
        n++
      ) {
        var i = a[n],
          s = i.transferSize,
          o = i.initiatorType,
          y = i.duration;
        if (s && y && Nh(o)) {
          for (o = 0, y = i.responseEnd, n += 1; n < a.length; n++) {
            var T = a[n],
              C = T.startTime;
            if (C > y) break;
            var H = T.transferSize,
              X = T.initiatorType;
            H &&
              Nh(X) &&
              ((T = T.responseEnd), (o += H * (T < y ? 1 : (y - C) / (T - C))));
          }
          if ((--n, (t += (8 * (s + o)) / (i.duration / 1e3)), e++, 10 < e))
            break;
        }
      }
      if (0 < e) return t / e / 1e6;
    }
    return navigator.connection &&
      ((e = navigator.connection.downlink), typeof e == 'number')
      ? e
      : 5;
  }
  var nc = null,
    lc = null;
  function ws(e) {
    return e.nodeType === 9 ? e : e.ownerDocument;
  }
  function Rh(e) {
    switch (e) {
      case 'http://www.w3.org/2000/svg':
        return 1;
      case 'http://www.w3.org/1998/Math/MathML':
        return 2;
      default:
        return 0;
    }
  }
  function zh(e, t) {
    if (e === 0)
      switch (t) {
        case 'svg':
          return 1;
        case 'math':
          return 2;
        default:
          return 0;
      }
    return e === 1 && t === 'foreignObject' ? 0 : e;
  }
  function ic(e, t) {
    return (
      e === 'textarea' ||
      e === 'noscript' ||
      typeof t.children == 'string' ||
      typeof t.children == 'number' ||
      typeof t.children == 'bigint' ||
      (typeof t.dangerouslySetInnerHTML == 'object' &&
        t.dangerouslySetInnerHTML !== null &&
        t.dangerouslySetInnerHTML.__html != null)
    );
  }
  var sc = null;
  function Fg() {
    var e = window.event;
    return e && e.type === 'popstate'
      ? e === sc
        ? !1
        : ((sc = e), !0)
      : ((sc = null), !1);
  }
  var _h = typeof setTimeout == 'function' ? setTimeout : void 0,
    Ig = typeof clearTimeout == 'function' ? clearTimeout : void 0,
    Oh = typeof Promise == 'function' ? Promise : void 0,
    Pg =
      typeof queueMicrotask == 'function'
        ? queueMicrotask
        : typeof Oh < 'u'
          ? function (e) {
              return Oh.resolve(null).then(e).catch(eb);
            }
          : _h;
  function eb(e) {
    setTimeout(function () {
      throw e;
    });
  }
  function Ja(e) {
    return e === 'head';
  }
  function Ch(e, t) {
    var a = t,
      n = 0;
    do {
      var i = a.nextSibling;
      if ((e.removeChild(a), i && i.nodeType === 8))
        if (((a = i.data), a === '/$' || a === '/&')) {
          if (n === 0) {
            (e.removeChild(i), pl(t));
            return;
          }
          n--;
        } else if (
          a === '$' ||
          a === '$?' ||
          a === '$~' ||
          a === '$!' ||
          a === '&'
        )
          n++;
        else if (a === 'html') si(e.ownerDocument.documentElement);
        else if (a === 'head') {
          ((a = e.ownerDocument.head), si(a));
          for (var s = a.firstChild; s; ) {
            var o = s.nextSibling,
              y = s.nodeName;
            (s[Al] ||
              y === 'SCRIPT' ||
              y === 'STYLE' ||
              (y === 'LINK' && s.rel.toLowerCase() === 'stylesheet') ||
              a.removeChild(s),
              (s = o));
          }
        } else a === 'body' && si(e.ownerDocument.body);
      a = i;
    } while (a);
    pl(t);
  }
  function Mh(e, t) {
    var a = e;
    e = 0;
    do {
      var n = a.nextSibling;
      if (
        (a.nodeType === 1
          ? t
            ? ((a._stashedDisplay = a.style.display),
              (a.style.display = 'none'))
            : ((a.style.display = a._stashedDisplay || ''),
              a.getAttribute('style') === '' && a.removeAttribute('style'))
          : a.nodeType === 3 &&
            (t
              ? ((a._stashedText = a.nodeValue), (a.nodeValue = ''))
              : (a.nodeValue = a._stashedText || '')),
        n && n.nodeType === 8)
      )
        if (((a = n.data), a === '/$')) {
          if (e === 0) break;
          e--;
        } else (a !== '$' && a !== '$?' && a !== '$~' && a !== '$!') || e++;
      a = n;
    } while (a);
  }
  function rc(e) {
    var t = e.firstChild;
    for (t && t.nodeType === 10 && (t = t.nextSibling); t; ) {
      var a = t;
      switch (((t = t.nextSibling), a.nodeName)) {
        case 'HTML':
        case 'HEAD':
        case 'BODY':
          (rc(a), dr(a));
          continue;
        case 'SCRIPT':
        case 'STYLE':
          continue;
        case 'LINK':
          if (a.rel.toLowerCase() === 'stylesheet') continue;
      }
      e.removeChild(a);
    }
  }
  function tb(e, t, a, n) {
    for (; e.nodeType === 1; ) {
      var i = a;
      if (e.nodeName.toLowerCase() !== t.toLowerCase()) {
        if (!n && (e.nodeName !== 'INPUT' || e.type !== 'hidden')) break;
      } else if (n) {
        if (!e[Al])
          switch (t) {
            case 'meta':
              if (!e.hasAttribute('itemprop')) break;
              return e;
            case 'link':
              if (
                ((s = e.getAttribute('rel')),
                s === 'stylesheet' && e.hasAttribute('data-precedence'))
              )
                break;
              if (
                s !== i.rel ||
                e.getAttribute('href') !==
                  (i.href == null || i.href === '' ? null : i.href) ||
                e.getAttribute('crossorigin') !==
                  (i.crossOrigin == null ? null : i.crossOrigin) ||
                e.getAttribute('title') !== (i.title == null ? null : i.title)
              )
                break;
              return e;
            case 'style':
              if (e.hasAttribute('data-precedence')) break;
              return e;
            case 'script':
              if (
                ((s = e.getAttribute('src')),
                (s !== (i.src == null ? null : i.src) ||
                  e.getAttribute('type') !== (i.type == null ? null : i.type) ||
                  e.getAttribute('crossorigin') !==
                    (i.crossOrigin == null ? null : i.crossOrigin)) &&
                  s &&
                  e.hasAttribute('async') &&
                  !e.hasAttribute('itemprop'))
              )
                break;
              return e;
            default:
              return e;
          }
      } else if (t === 'input' && e.type === 'hidden') {
        var s = i.name == null ? null : '' + i.name;
        if (i.type === 'hidden' && e.getAttribute('name') === s) return e;
      } else return e;
      if (((e = Xt(e.nextSibling)), e === null)) break;
    }
    return null;
  }
  function ab(e, t, a) {
    if (t === '') return null;
    for (; e.nodeType !== 3; )
      if (
        ((e.nodeType !== 1 || e.nodeName !== 'INPUT' || e.type !== 'hidden') &&
          !a) ||
        ((e = Xt(e.nextSibling)), e === null)
      )
        return null;
    return e;
  }
  function Dh(e, t) {
    for (; e.nodeType !== 8; )
      if (
        ((e.nodeType !== 1 || e.nodeName !== 'INPUT' || e.type !== 'hidden') &&
          !t) ||
        ((e = Xt(e.nextSibling)), e === null)
      )
        return null;
    return e;
  }
  function uc(e) {
    return e.data === '$?' || e.data === '$~';
  }
  function cc(e) {
    return (
      e.data === '$!' ||
      (e.data === '$?' && e.ownerDocument.readyState !== 'loading')
    );
  }
  function nb(e, t) {
    var a = e.ownerDocument;
    if (e.data === '$~') e._reactRetry = t;
    else if (e.data !== '$?' || a.readyState !== 'loading') t();
    else {
      var n = function () {
        (t(), a.removeEventListener('DOMContentLoaded', n));
      };
      (a.addEventListener('DOMContentLoaded', n), (e._reactRetry = n));
    }
  }
  function Xt(e) {
    for (; e != null; e = e.nextSibling) {
      var t = e.nodeType;
      if (t === 1 || t === 3) break;
      if (t === 8) {
        if (
          ((t = e.data),
          t === '$' ||
            t === '$!' ||
            t === '$?' ||
            t === '$~' ||
            t === '&' ||
            t === 'F!' ||
            t === 'F')
        )
          break;
        if (t === '/$' || t === '/&') return null;
      }
    }
    return e;
  }
  var oc = null;
  function Uh(e) {
    e = e.nextSibling;
    for (var t = 0; e; ) {
      if (e.nodeType === 8) {
        var a = e.data;
        if (a === '/$' || a === '/&') {
          if (t === 0) return Xt(e.nextSibling);
          t--;
        } else
          (a !== '$' && a !== '$!' && a !== '$?' && a !== '$~' && a !== '&') ||
            t++;
      }
      e = e.nextSibling;
    }
    return null;
  }
  function kh(e) {
    e = e.previousSibling;
    for (var t = 0; e; ) {
      if (e.nodeType === 8) {
        var a = e.data;
        if (a === '$' || a === '$!' || a === '$?' || a === '$~' || a === '&') {
          if (t === 0) return e;
          t--;
        } else (a !== '/$' && a !== '/&') || t++;
      }
      e = e.previousSibling;
    }
    return null;
  }
  function Hh(e, t, a) {
    switch (((t = ws(a)), e)) {
      case 'html':
        if (((e = t.documentElement), !e)) throw Error(c(452));
        return e;
      case 'head':
        if (((e = t.head), !e)) throw Error(c(453));
        return e;
      case 'body':
        if (((e = t.body), !e)) throw Error(c(454));
        return e;
      default:
        throw Error(c(451));
    }
  }
  function si(e) {
    for (var t = e.attributes; t.length; ) e.removeAttributeNode(t[0]);
    dr(e);
  }
  var Zt = new Map(),
    Bh = new Set();
  function js(e) {
    return typeof e.getRootNode == 'function'
      ? e.getRootNode()
      : e.nodeType === 9
        ? e
        : e.ownerDocument;
  }
  var Ta = q.d;
  q.d = { f: lb, r: ib, D: sb, C: rb, L: ub, m: cb, X: fb, S: ob, M: db };
  function lb() {
    var e = Ta.f(),
      t = gs();
    return e || t;
  }
  function ib(e) {
    var t = Un(e);
    t !== null && t.tag === 5 && t.type === 'form' ? td(t) : Ta.r(e);
  }
  var hl = typeof document > 'u' ? null : document;
  function qh(e, t, a) {
    var n = hl;
    if (n && typeof t == 'string' && t) {
      var i = kt(t);
      ((i = 'link[rel="' + e + '"][href="' + i + '"]'),
        typeof a == 'string' && (i += '[crossorigin="' + a + '"]'),
        Bh.has(i) ||
          (Bh.add(i),
          (e = { rel: e, crossOrigin: a, href: t }),
          n.querySelector(i) === null &&
            ((t = n.createElement('link')),
            ht(t, 'link', e),
            st(t),
            n.head.appendChild(t))));
    }
  }
  function sb(e) {
    (Ta.D(e), qh('dns-prefetch', e, null));
  }
  function rb(e, t) {
    (Ta.C(e, t), qh('preconnect', e, t));
  }
  function ub(e, t, a) {
    Ta.L(e, t, a);
    var n = hl;
    if (n && e && t) {
      var i = 'link[rel="preload"][as="' + kt(t) + '"]';
      t === 'image' && a && a.imageSrcSet
        ? ((i += '[imagesrcset="' + kt(a.imageSrcSet) + '"]'),
          typeof a.imageSizes == 'string' &&
            (i += '[imagesizes="' + kt(a.imageSizes) + '"]'))
        : (i += '[href="' + kt(e) + '"]');
      var s = i;
      switch (t) {
        case 'style':
          s = ml(e);
          break;
        case 'script':
          s = yl(e);
      }
      Zt.has(s) ||
        ((e = b(
          {
            rel: 'preload',
            href: t === 'image' && a && a.imageSrcSet ? void 0 : e,
            as: t,
          },
          a,
        )),
        Zt.set(s, e),
        n.querySelector(i) !== null ||
          (t === 'style' && n.querySelector(ri(s))) ||
          (t === 'script' && n.querySelector(ui(s))) ||
          ((t = n.createElement('link')),
          ht(t, 'link', e),
          st(t),
          n.head.appendChild(t)));
    }
  }
  function cb(e, t) {
    Ta.m(e, t);
    var a = hl;
    if (a && e) {
      var n = t && typeof t.as == 'string' ? t.as : 'script',
        i =
          'link[rel="modulepreload"][as="' + kt(n) + '"][href="' + kt(e) + '"]',
        s = i;
      switch (n) {
        case 'audioworklet':
        case 'paintworklet':
        case 'serviceworker':
        case 'sharedworker':
        case 'worker':
        case 'script':
          s = yl(e);
      }
      if (
        !Zt.has(s) &&
        ((e = b({ rel: 'modulepreload', href: e }, t)),
        Zt.set(s, e),
        a.querySelector(i) === null)
      ) {
        switch (n) {
          case 'audioworklet':
          case 'paintworklet':
          case 'serviceworker':
          case 'sharedworker':
          case 'worker':
          case 'script':
            if (a.querySelector(ui(s))) return;
        }
        ((n = a.createElement('link')),
          ht(n, 'link', e),
          st(n),
          a.head.appendChild(n));
      }
    }
  }
  function ob(e, t, a) {
    Ta.S(e, t, a);
    var n = hl;
    if (n && e) {
      var i = kn(n).hoistableStyles,
        s = ml(e);
      t = t || 'default';
      var o = i.get(s);
      if (!o) {
        var y = { loading: 0, preload: null };
        if ((o = n.querySelector(ri(s)))) y.loading = 5;
        else {
          ((e = b({ rel: 'stylesheet', href: e, 'data-precedence': t }, a)),
            (a = Zt.get(s)) && fc(e, a));
          var T = (o = n.createElement('link'));
          (st(T),
            ht(T, 'link', e),
            (T._p = new Promise(function (C, H) {
              ((T.onload = C), (T.onerror = H));
            })),
            T.addEventListener('load', function () {
              y.loading |= 1;
            }),
            T.addEventListener('error', function () {
              y.loading |= 2;
            }),
            (y.loading |= 4),
            Ns(o, t, n));
        }
        ((o = { type: 'stylesheet', instance: o, count: 1, state: y }),
          i.set(s, o));
      }
    }
  }
  function fb(e, t) {
    Ta.X(e, t);
    var a = hl;
    if (a && e) {
      var n = kn(a).hoistableScripts,
        i = yl(e),
        s = n.get(i);
      s ||
        ((s = a.querySelector(ui(i))),
        s ||
          ((e = b({ src: e, async: !0 }, t)),
          (t = Zt.get(i)) && dc(e, t),
          (s = a.createElement('script')),
          st(s),
          ht(s, 'link', e),
          a.head.appendChild(s)),
        (s = { type: 'script', instance: s, count: 1, state: null }),
        n.set(i, s));
    }
  }
  function db(e, t) {
    Ta.M(e, t);
    var a = hl;
    if (a && e) {
      var n = kn(a).hoistableScripts,
        i = yl(e),
        s = n.get(i);
      s ||
        ((s = a.querySelector(ui(i))),
        s ||
          ((e = b({ src: e, async: !0, type: 'module' }, t)),
          (t = Zt.get(i)) && dc(e, t),
          (s = a.createElement('script')),
          st(s),
          ht(s, 'link', e),
          a.head.appendChild(s)),
        (s = { type: 'script', instance: s, count: 1, state: null }),
        n.set(i, s));
    }
  }
  function Lh(e, t, a, n) {
    var i = (i = K.current) ? js(i) : null;
    if (!i) throw Error(c(446));
    switch (e) {
      case 'meta':
      case 'title':
        return null;
      case 'style':
        return typeof a.precedence == 'string' && typeof a.href == 'string'
          ? ((t = ml(a.href)),
            (a = kn(i).hoistableStyles),
            (n = a.get(t)),
            n ||
              ((n = { type: 'style', instance: null, count: 0, state: null }),
              a.set(t, n)),
            n)
          : { type: 'void', instance: null, count: 0, state: null };
      case 'link':
        if (
          a.rel === 'stylesheet' &&
          typeof a.href == 'string' &&
          typeof a.precedence == 'string'
        ) {
          e = ml(a.href);
          var s = kn(i).hoistableStyles,
            o = s.get(e);
          if (
            (o ||
              ((i = i.ownerDocument || i),
              (o = {
                type: 'stylesheet',
                instance: null,
                count: 0,
                state: { loading: 0, preload: null },
              }),
              s.set(e, o),
              (s = i.querySelector(ri(e))) &&
                !s._p &&
                ((o.instance = s), (o.state.loading = 5)),
              Zt.has(e) ||
                ((a = {
                  rel: 'preload',
                  as: 'style',
                  href: a.href,
                  crossOrigin: a.crossOrigin,
                  integrity: a.integrity,
                  media: a.media,
                  hrefLang: a.hrefLang,
                  referrerPolicy: a.referrerPolicy,
                }),
                Zt.set(e, a),
                s || hb(i, e, a, o.state))),
            t && n === null)
          )
            throw Error(c(528, ''));
          return o;
        }
        if (t && n !== null) throw Error(c(529, ''));
        return null;
      case 'script':
        return (
          (t = a.async),
          (a = a.src),
          typeof a == 'string' &&
          t &&
          typeof t != 'function' &&
          typeof t != 'symbol'
            ? ((t = yl(a)),
              (a = kn(i).hoistableScripts),
              (n = a.get(t)),
              n ||
                ((n = {
                  type: 'script',
                  instance: null,
                  count: 0,
                  state: null,
                }),
                a.set(t, n)),
              n)
            : { type: 'void', instance: null, count: 0, state: null }
        );
      default:
        throw Error(c(444, e));
    }
  }
  function ml(e) {
    return 'href="' + kt(e) + '"';
  }
  function ri(e) {
    return 'link[rel="stylesheet"][' + e + ']';
  }
  function Yh(e) {
    return b({}, e, { 'data-precedence': e.precedence, precedence: null });
  }
  function hb(e, t, a, n) {
    e.querySelector('link[rel="preload"][as="style"][' + t + ']')
      ? (n.loading = 1)
      : ((t = e.createElement('link')),
        (n.preload = t),
        t.addEventListener('load', function () {
          return (n.loading |= 1);
        }),
        t.addEventListener('error', function () {
          return (n.loading |= 2);
        }),
        ht(t, 'link', a),
        st(t),
        e.head.appendChild(t));
  }
  function yl(e) {
    return '[src="' + kt(e) + '"]';
  }
  function ui(e) {
    return 'script[async]' + e;
  }
  function Gh(e, t, a) {
    if ((t.count++, t.instance === null))
      switch (t.type) {
        case 'style':
          var n = e.querySelector('style[data-href~="' + kt(a.href) + '"]');
          if (n) return ((t.instance = n), st(n), n);
          var i = b({}, a, {
            'data-href': a.href,
            'data-precedence': a.precedence,
            href: null,
            precedence: null,
          });
          return (
            (n = (e.ownerDocument || e).createElement('style')),
            st(n),
            ht(n, 'style', i),
            Ns(n, a.precedence, e),
            (t.instance = n)
          );
        case 'stylesheet':
          i = ml(a.href);
          var s = e.querySelector(ri(i));
          if (s) return ((t.state.loading |= 4), (t.instance = s), st(s), s);
          ((n = Yh(a)),
            (i = Zt.get(i)) && fc(n, i),
            (s = (e.ownerDocument || e).createElement('link')),
            st(s));
          var o = s;
          return (
            (o._p = new Promise(function (y, T) {
              ((o.onload = y), (o.onerror = T));
            })),
            ht(s, 'link', n),
            (t.state.loading |= 4),
            Ns(s, a.precedence, e),
            (t.instance = s)
          );
        case 'script':
          return (
            (s = yl(a.src)),
            (i = e.querySelector(ui(s)))
              ? ((t.instance = i), st(i), i)
              : ((n = a),
                (i = Zt.get(s)) && ((n = b({}, a)), dc(n, i)),
                (e = e.ownerDocument || e),
                (i = e.createElement('script')),
                st(i),
                ht(i, 'link', n),
                e.head.appendChild(i),
                (t.instance = i))
          );
        case 'void':
          return null;
        default:
          throw Error(c(443, t.type));
      }
    else
      t.type === 'stylesheet' &&
        (t.state.loading & 4) === 0 &&
        ((n = t.instance), (t.state.loading |= 4), Ns(n, a.precedence, e));
    return t.instance;
  }
  function Ns(e, t, a) {
    for (
      var n = a.querySelectorAll(
          'link[rel="stylesheet"][data-precedence],style[data-precedence]',
        ),
        i = n.length ? n[n.length - 1] : null,
        s = i,
        o = 0;
      o < n.length;
      o++
    ) {
      var y = n[o];
      if (y.dataset.precedence === t) s = y;
      else if (s !== i) break;
    }
    s
      ? s.parentNode.insertBefore(e, s.nextSibling)
      : ((t = a.nodeType === 9 ? a.head : a), t.insertBefore(e, t.firstChild));
  }
  function fc(e, t) {
    (e.crossOrigin == null && (e.crossOrigin = t.crossOrigin),
      e.referrerPolicy == null && (e.referrerPolicy = t.referrerPolicy),
      e.title == null && (e.title = t.title));
  }
  function dc(e, t) {
    (e.crossOrigin == null && (e.crossOrigin = t.crossOrigin),
      e.referrerPolicy == null && (e.referrerPolicy = t.referrerPolicy),
      e.integrity == null && (e.integrity = t.integrity));
  }
  var Rs = null;
  function Xh(e, t, a) {
    if (Rs === null) {
      var n = new Map(),
        i = (Rs = new Map());
      i.set(a, n);
    } else ((i = Rs), (n = i.get(a)), n || ((n = new Map()), i.set(a, n)));
    if (n.has(e)) return n;
    for (
      n.set(e, null), a = a.getElementsByTagName(e), i = 0;
      i < a.length;
      i++
    ) {
      var s = a[i];
      if (
        !(
          s[Al] ||
          s[ct] ||
          (e === 'link' && s.getAttribute('rel') === 'stylesheet')
        ) &&
        s.namespaceURI !== 'http://www.w3.org/2000/svg'
      ) {
        var o = s.getAttribute(t) || '';
        o = e + o;
        var y = n.get(o);
        y ? y.push(s) : n.set(o, [s]);
      }
    }
    return n;
  }
  function Zh(e, t, a) {
    ((e = e.ownerDocument || e),
      e.head.insertBefore(
        a,
        t === 'title' ? e.querySelector('head > title') : null,
      ));
  }
  function mb(e, t, a) {
    if (a === 1 || t.itemProp != null) return !1;
    switch (e) {
      case 'meta':
      case 'title':
        return !0;
      case 'style':
        if (
          typeof t.precedence != 'string' ||
          typeof t.href != 'string' ||
          t.href === ''
        )
          break;
        return !0;
      case 'link':
        if (
          typeof t.rel != 'string' ||
          typeof t.href != 'string' ||
          t.href === '' ||
          t.onLoad ||
          t.onError
        )
          break;
        switch (t.rel) {
          case 'stylesheet':
            return (
              (e = t.disabled),
              typeof t.precedence == 'string' && e == null
            );
          default:
            return !0;
        }
      case 'script':
        if (
          t.async &&
          typeof t.async != 'function' &&
          typeof t.async != 'symbol' &&
          !t.onLoad &&
          !t.onError &&
          t.src &&
          typeof t.src == 'string'
        )
          return !0;
    }
    return !1;
  }
  function Qh(e) {
    return !(e.type === 'stylesheet' && (e.state.loading & 3) === 0);
  }
  function yb(e, t, a, n) {
    if (
      a.type === 'stylesheet' &&
      (typeof n.media != 'string' || matchMedia(n.media).matches !== !1) &&
      (a.state.loading & 4) === 0
    ) {
      if (a.instance === null) {
        var i = ml(n.href),
          s = t.querySelector(ri(i));
        if (s) {
          ((t = s._p),
            t !== null &&
              typeof t == 'object' &&
              typeof t.then == 'function' &&
              (e.count++, (e = zs.bind(e)), t.then(e, e)),
            (a.state.loading |= 4),
            (a.instance = s),
            st(s));
          return;
        }
        ((s = t.ownerDocument || t),
          (n = Yh(n)),
          (i = Zt.get(i)) && fc(n, i),
          (s = s.createElement('link')),
          st(s));
        var o = s;
        ((o._p = new Promise(function (y, T) {
          ((o.onload = y), (o.onerror = T));
        })),
          ht(s, 'link', n),
          (a.instance = s));
      }
      (e.stylesheets === null && (e.stylesheets = new Map()),
        e.stylesheets.set(a, t),
        (t = a.state.preload) &&
          (a.state.loading & 3) === 0 &&
          (e.count++,
          (a = zs.bind(e)),
          t.addEventListener('load', a),
          t.addEventListener('error', a)));
    }
  }
  var hc = 0;
  function pb(e, t) {
    return (
      e.stylesheets && e.count === 0 && Os(e, e.stylesheets),
      0 < e.count || 0 < e.imgCount
        ? function (a) {
            var n = setTimeout(function () {
              if ((e.stylesheets && Os(e, e.stylesheets), e.unsuspend)) {
                var s = e.unsuspend;
                ((e.unsuspend = null), s());
              }
            }, 6e4 + t);
            0 < e.imgBytes && hc === 0 && (hc = 62500 * Wg());
            var i = setTimeout(
              function () {
                if (
                  ((e.waitingForImages = !1),
                  e.count === 0 &&
                    (e.stylesheets && Os(e, e.stylesheets), e.unsuspend))
                ) {
                  var s = e.unsuspend;
                  ((e.unsuspend = null), s());
                }
              },
              (e.imgBytes > hc ? 50 : 800) + t,
            );
            return (
              (e.unsuspend = a),
              function () {
                ((e.unsuspend = null), clearTimeout(n), clearTimeout(i));
              }
            );
          }
        : null
    );
  }
  function zs() {
    if (
      (this.count--,
      this.count === 0 && (this.imgCount === 0 || !this.waitingForImages))
    ) {
      if (this.stylesheets) Os(this, this.stylesheets);
      else if (this.unsuspend) {
        var e = this.unsuspend;
        ((this.unsuspend = null), e());
      }
    }
  }
  var _s = null;
  function Os(e, t) {
    ((e.stylesheets = null),
      e.unsuspend !== null &&
        (e.count++,
        (_s = new Map()),
        t.forEach(gb, e),
        (_s = null),
        zs.call(e)));
  }
  function gb(e, t) {
    if (!(t.state.loading & 4)) {
      var a = _s.get(e);
      if (a) var n = a.get(null);
      else {
        ((a = new Map()), _s.set(e, a));
        for (
          var i = e.querySelectorAll(
              'link[data-precedence],style[data-precedence]',
            ),
            s = 0;
          s < i.length;
          s++
        ) {
          var o = i[s];
          (o.nodeName === 'LINK' || o.getAttribute('media') !== 'not all') &&
            (a.set(o.dataset.precedence, o), (n = o));
        }
        n && a.set(null, n);
      }
      ((i = t.instance),
        (o = i.getAttribute('data-precedence')),
        (s = a.get(o) || n),
        s === n && a.set(null, i),
        a.set(o, i),
        this.count++,
        (n = zs.bind(this)),
        i.addEventListener('load', n),
        i.addEventListener('error', n),
        s
          ? s.parentNode.insertBefore(i, s.nextSibling)
          : ((e = e.nodeType === 9 ? e.head : e),
            e.insertBefore(i, e.firstChild)),
        (t.state.loading |= 4));
    }
  }
  var ci = {
    $$typeof: F,
    Provider: null,
    Consumer: null,
    _currentValue: le,
    _currentValue2: le,
    _threadCount: 0,
  };
  function bb(e, t, a, n, i, s, o, y, T) {
    ((this.tag = 1),
      (this.containerInfo = e),
      (this.pingCache = this.current = this.pendingChildren = null),
      (this.timeoutHandle = -1),
      (this.callbackNode =
        this.next =
        this.pendingContext =
        this.context =
        this.cancelPendingCommit =
          null),
      (this.callbackPriority = 0),
      (this.expirationTimes = ur(-1)),
      (this.entangledLanes =
        this.shellSuspendCounter =
        this.errorRecoveryDisabledLanes =
        this.expiredLanes =
        this.warmLanes =
        this.pingedLanes =
        this.suspendedLanes =
        this.pendingLanes =
          0),
      (this.entanglements = ur(0)),
      (this.hiddenUpdates = ur(null)),
      (this.identifierPrefix = n),
      (this.onUncaughtError = i),
      (this.onCaughtError = s),
      (this.onRecoverableError = o),
      (this.pooledCache = null),
      (this.pooledCacheLanes = 0),
      (this.formState = T),
      (this.incompleteTransitions = new Map()));
  }
  function Vh(e, t, a, n, i, s, o, y, T, C, H, X) {
    return (
      (e = new bb(e, t, a, o, T, C, H, X, y)),
      (t = 1),
      s === !0 && (t |= 24),
      (s = Rt(3, null, null, t)),
      (e.current = s),
      (s.stateNode = e),
      (t = Vr()),
      t.refCount++,
      (e.pooledCache = t),
      t.refCount++,
      (s.memoizedState = { element: n, isDehydrated: a, cache: t }),
      Wr(s),
      e
    );
  }
  function Kh(e) {
    return e ? ((e = Vn), e) : Vn;
  }
  function Jh(e, t, a, n, i, s) {
    ((i = Kh(i)),
      n.context === null ? (n.context = i) : (n.pendingContext = i),
      (n = Ha(t)),
      (n.payload = { element: a }),
      (s = s === void 0 ? null : s),
      s !== null && (n.callback = s),
      (a = Ba(e, n, t)),
      a !== null && (Tt(a, e, t), Yl(a, e, t)));
  }
  function $h(e, t) {
    if (((e = e.memoizedState), e !== null && e.dehydrated !== null)) {
      var a = e.retryLane;
      e.retryLane = a !== 0 && a < t ? a : t;
    }
  }
  function mc(e, t) {
    ($h(e, t), (e = e.alternate) && $h(e, t));
  }
  function Wh(e) {
    if (e.tag === 13 || e.tag === 31) {
      var t = hn(e, 67108864);
      (t !== null && Tt(t, e, 67108864), mc(e, 67108864));
    }
  }
  function Fh(e) {
    if (e.tag === 13 || e.tag === 31) {
      var t = Mt();
      t = cr(t);
      var a = hn(e, t);
      (a !== null && Tt(a, e, t), mc(e, t));
    }
  }
  var Cs = !0;
  function vb(e, t, a, n) {
    var i = z.T;
    z.T = null;
    var s = q.p;
    try {
      ((q.p = 2), yc(e, t, a, n));
    } finally {
      ((q.p = s), (z.T = i));
    }
  }
  function xb(e, t, a, n) {
    var i = z.T;
    z.T = null;
    var s = q.p;
    try {
      ((q.p = 8), yc(e, t, a, n));
    } finally {
      ((q.p = s), (z.T = i));
    }
  }
  function yc(e, t, a, n) {
    if (Cs) {
      var i = pc(n);
      if (i === null) (tc(e, t, n, Ms, a), Ph(e, n));
      else if (Eb(i, e, t, a, n)) n.stopPropagation();
      else if ((Ph(e, n), t & 4 && -1 < Sb.indexOf(e))) {
        for (; i !== null; ) {
          var s = Un(i);
          if (s !== null)
            switch (s.tag) {
              case 3:
                if (((s = s.stateNode), s.current.memoizedState.isDehydrated)) {
                  var o = un(s.pendingLanes);
                  if (o !== 0) {
                    var y = s;
                    for (y.pendingLanes |= 2, y.entangledLanes |= 2; o; ) {
                      var T = 1 << (31 - jt(o));
                      ((y.entanglements[1] |= T), (o &= ~T));
                    }
                    (Pt(s), (Oe & 6) === 0 && ((ys = At() + 500), ni(0)));
                  }
                }
                break;
              case 31:
              case 13:
                ((y = hn(s, 2)), y !== null && Tt(y, s, 2), gs(), mc(s, 2));
            }
          if (((s = pc(n)), s === null && tc(e, t, n, Ms, a), s === i)) break;
          i = s;
        }
        i !== null && n.stopPropagation();
      } else tc(e, t, n, null, a);
    }
  }
  function pc(e) {
    return ((e = br(e)), gc(e));
  }
  var Ms = null;
  function gc(e) {
    if (((Ms = null), (e = Dn(e)), e !== null)) {
      var t = d(e);
      if (t === null) e = null;
      else {
        var a = t.tag;
        if (a === 13) {
          if (((e = m(t)), e !== null)) return e;
          e = null;
        } else if (a === 31) {
          if (((e = x(t)), e !== null)) return e;
          e = null;
        } else if (a === 3) {
          if (t.stateNode.current.memoizedState.isDehydrated)
            return t.tag === 3 ? t.stateNode.containerInfo : null;
          e = null;
        } else t !== e && (e = null);
      }
    }
    return ((Ms = e), null);
  }
  function Ih(e) {
    switch (e) {
      case 'beforetoggle':
      case 'cancel':
      case 'click':
      case 'close':
      case 'contextmenu':
      case 'copy':
      case 'cut':
      case 'auxclick':
      case 'dblclick':
      case 'dragend':
      case 'dragstart':
      case 'drop':
      case 'focusin':
      case 'focusout':
      case 'input':
      case 'invalid':
      case 'keydown':
      case 'keypress':
      case 'keyup':
      case 'mousedown':
      case 'mouseup':
      case 'paste':
      case 'pause':
      case 'play':
      case 'pointercancel':
      case 'pointerdown':
      case 'pointerup':
      case 'ratechange':
      case 'reset':
      case 'resize':
      case 'seeked':
      case 'submit':
      case 'toggle':
      case 'touchcancel':
      case 'touchend':
      case 'touchstart':
      case 'volumechange':
      case 'change':
      case 'selectionchange':
      case 'textInput':
      case 'compositionstart':
      case 'compositionend':
      case 'compositionupdate':
      case 'beforeblur':
      case 'afterblur':
      case 'beforeinput':
      case 'blur':
      case 'fullscreenchange':
      case 'focus':
      case 'hashchange':
      case 'popstate':
      case 'select':
      case 'selectstart':
        return 2;
      case 'drag':
      case 'dragenter':
      case 'dragexit':
      case 'dragleave':
      case 'dragover':
      case 'mousemove':
      case 'mouseout':
      case 'mouseover':
      case 'pointermove':
      case 'pointerout':
      case 'pointerover':
      case 'scroll':
      case 'touchmove':
      case 'wheel':
      case 'mouseenter':
      case 'mouseleave':
      case 'pointerenter':
      case 'pointerleave':
        return 8;
      case 'message':
        switch (sp()) {
          case lo:
            return 2;
          case io:
            return 8;
          case Ei:
          case rp:
            return 32;
          case so:
            return 268435456;
          default:
            return 32;
        }
      default:
        return 32;
    }
  }
  var bc = !1,
    $a = null,
    Wa = null,
    Fa = null,
    oi = new Map(),
    fi = new Map(),
    Ia = [],
    Sb =
      'mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset'.split(
        ' ',
      );
  function Ph(e, t) {
    switch (e) {
      case 'focusin':
      case 'focusout':
        $a = null;
        break;
      case 'dragenter':
      case 'dragleave':
        Wa = null;
        break;
      case 'mouseover':
      case 'mouseout':
        Fa = null;
        break;
      case 'pointerover':
      case 'pointerout':
        oi.delete(t.pointerId);
        break;
      case 'gotpointercapture':
      case 'lostpointercapture':
        fi.delete(t.pointerId);
    }
  }
  function di(e, t, a, n, i, s) {
    return e === null || e.nativeEvent !== s
      ? ((e = {
          blockedOn: t,
          domEventName: a,
          eventSystemFlags: n,
          nativeEvent: s,
          targetContainers: [i],
        }),
        t !== null && ((t = Un(t)), t !== null && Wh(t)),
        e)
      : ((e.eventSystemFlags |= n),
        (t = e.targetContainers),
        i !== null && t.indexOf(i) === -1 && t.push(i),
        e);
  }
  function Eb(e, t, a, n, i) {
    switch (t) {
      case 'focusin':
        return (($a = di($a, e, t, a, n, i)), !0);
      case 'dragenter':
        return ((Wa = di(Wa, e, t, a, n, i)), !0);
      case 'mouseover':
        return ((Fa = di(Fa, e, t, a, n, i)), !0);
      case 'pointerover':
        var s = i.pointerId;
        return (oi.set(s, di(oi.get(s) || null, e, t, a, n, i)), !0);
      case 'gotpointercapture':
        return (
          (s = i.pointerId),
          fi.set(s, di(fi.get(s) || null, e, t, a, n, i)),
          !0
        );
    }
    return !1;
  }
  function em(e) {
    var t = Dn(e.target);
    if (t !== null) {
      var a = d(t);
      if (a !== null) {
        if (((t = a.tag), t === 13)) {
          if (((t = m(a)), t !== null)) {
            ((e.blockedOn = t),
              ho(e.priority, function () {
                Fh(a);
              }));
            return;
          }
        } else if (t === 31) {
          if (((t = x(a)), t !== null)) {
            ((e.blockedOn = t),
              ho(e.priority, function () {
                Fh(a);
              }));
            return;
          }
        } else if (t === 3 && a.stateNode.current.memoizedState.isDehydrated) {
          e.blockedOn = a.tag === 3 ? a.stateNode.containerInfo : null;
          return;
        }
      }
    }
    e.blockedOn = null;
  }
  function Ds(e) {
    if (e.blockedOn !== null) return !1;
    for (var t = e.targetContainers; 0 < t.length; ) {
      var a = pc(e.nativeEvent);
      if (a === null) {
        a = e.nativeEvent;
        var n = new a.constructor(a.type, a);
        ((gr = n), a.target.dispatchEvent(n), (gr = null));
      } else return ((t = Un(a)), t !== null && Wh(t), (e.blockedOn = a), !1);
      t.shift();
    }
    return !0;
  }
  function tm(e, t, a) {
    Ds(e) && a.delete(t);
  }
  function Tb() {
    ((bc = !1),
      $a !== null && Ds($a) && ($a = null),
      Wa !== null && Ds(Wa) && (Wa = null),
      Fa !== null && Ds(Fa) && (Fa = null),
      oi.forEach(tm),
      fi.forEach(tm));
  }
  function Us(e, t) {
    e.blockedOn === t &&
      ((e.blockedOn = null),
      bc ||
        ((bc = !0),
        l.unstable_scheduleCallback(l.unstable_NormalPriority, Tb)));
  }
  var ks = null;
  function am(e) {
    ks !== e &&
      ((ks = e),
      l.unstable_scheduleCallback(l.unstable_NormalPriority, function () {
        ks === e && (ks = null);
        for (var t = 0; t < e.length; t += 3) {
          var a = e[t],
            n = e[t + 1],
            i = e[t + 2];
          if (typeof n != 'function') {
            if (gc(n || a) === null) continue;
            break;
          }
          var s = Un(a);
          s !== null &&
            (e.splice(t, 3),
            (t -= 3),
            pu(s, { pending: !0, data: i, method: a.method, action: n }, n, i));
        }
      }));
  }
  function pl(e) {
    function t(T) {
      return Us(T, e);
    }
    ($a !== null && Us($a, e),
      Wa !== null && Us(Wa, e),
      Fa !== null && Us(Fa, e),
      oi.forEach(t),
      fi.forEach(t));
    for (var a = 0; a < Ia.length; a++) {
      var n = Ia[a];
      n.blockedOn === e && (n.blockedOn = null);
    }
    for (; 0 < Ia.length && ((a = Ia[0]), a.blockedOn === null); )
      (em(a), a.blockedOn === null && Ia.shift());
    if (((a = (e.ownerDocument || e).$$reactFormReplay), a != null))
      for (n = 0; n < a.length; n += 3) {
        var i = a[n],
          s = a[n + 1],
          o = i[gt] || null;
        if (typeof s == 'function') o || am(a);
        else if (o) {
          var y = null;
          if (s && s.hasAttribute('formAction')) {
            if (((i = s), (o = s[gt] || null))) y = o.formAction;
            else if (gc(i) !== null) continue;
          } else y = o.action;
          (typeof y == 'function' ? (a[n + 1] = y) : (a.splice(n, 3), (n -= 3)),
            am(a));
        }
      }
  }
  function nm() {
    function e(s) {
      s.canIntercept &&
        s.info === 'react-transition' &&
        s.intercept({
          handler: function () {
            return new Promise(function (o) {
              return (i = o);
            });
          },
          focusReset: 'manual',
          scroll: 'manual',
        });
    }
    function t() {
      (i !== null && (i(), (i = null)), n || setTimeout(a, 20));
    }
    function a() {
      if (!n && !navigation.transition) {
        var s = navigation.currentEntry;
        s &&
          s.url != null &&
          navigation.navigate(s.url, {
            state: s.getState(),
            info: 'react-transition',
            history: 'replace',
          });
      }
    }
    if (typeof navigation == 'object') {
      var n = !1,
        i = null;
      return (
        navigation.addEventListener('navigate', e),
        navigation.addEventListener('navigatesuccess', t),
        navigation.addEventListener('navigateerror', t),
        setTimeout(a, 100),
        function () {
          ((n = !0),
            navigation.removeEventListener('navigate', e),
            navigation.removeEventListener('navigatesuccess', t),
            navigation.removeEventListener('navigateerror', t),
            i !== null && (i(), (i = null)));
        }
      );
    }
  }
  function vc(e) {
    this._internalRoot = e;
  }
  ((Hs.prototype.render = vc.prototype.render =
    function (e) {
      var t = this._internalRoot;
      if (t === null) throw Error(c(409));
      var a = t.current,
        n = Mt();
      Jh(a, n, e, t, null, null);
    }),
    (Hs.prototype.unmount = vc.prototype.unmount =
      function () {
        var e = this._internalRoot;
        if (e !== null) {
          this._internalRoot = null;
          var t = e.containerInfo;
          (Jh(e.current, 2, null, e, null, null), gs(), (t[Mn] = null));
        }
      }));
  function Hs(e) {
    this._internalRoot = e;
  }
  Hs.prototype.unstable_scheduleHydration = function (e) {
    if (e) {
      var t = fo();
      e = { blockedOn: null, target: e, priority: t };
      for (var a = 0; a < Ia.length && t !== 0 && t < Ia[a].priority; a++);
      (Ia.splice(a, 0, e), a === 0 && em(e));
    }
  };
  var lm = r.version;
  if (lm !== '19.2.5') throw Error(c(527, lm, '19.2.5'));
  q.findDOMNode = function (e) {
    var t = e._reactInternals;
    if (t === void 0)
      throw typeof e.render == 'function'
        ? Error(c(188))
        : ((e = Object.keys(e).join(',')), Error(c(268, e)));
    return (
      (e = v(t)),
      (e = e !== null ? S(e) : null),
      (e = e === null ? null : e.stateNode),
      e
    );
  };
  var Ab = {
    bundleType: 0,
    version: '19.2.5',
    rendererPackageName: 'react-dom',
    currentDispatcherRef: z,
    reconcilerVersion: '19.2.5',
  };
  if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ < 'u') {
    var Bs = __REACT_DEVTOOLS_GLOBAL_HOOK__;
    if (!Bs.isDisabled && Bs.supportsFiber)
      try {
        ((Sl = Bs.inject(Ab)), (wt = Bs));
      } catch {}
  }
  return (
    (mi.createRoot = function (e, t) {
      if (!f(e)) throw Error(c(299));
      var a = !1,
        n = '',
        i = fd,
        s = dd,
        o = hd;
      return (
        t != null &&
          (t.unstable_strictMode === !0 && (a = !0),
          t.identifierPrefix !== void 0 && (n = t.identifierPrefix),
          t.onUncaughtError !== void 0 && (i = t.onUncaughtError),
          t.onCaughtError !== void 0 && (s = t.onCaughtError),
          t.onRecoverableError !== void 0 && (o = t.onRecoverableError)),
        (t = Vh(e, 1, !1, null, null, a, n, null, i, s, o, nm)),
        (e[Mn] = t.current),
        ec(e),
        new vc(t)
      );
    }),
    (mi.hydrateRoot = function (e, t, a) {
      if (!f(e)) throw Error(c(299));
      var n = !1,
        i = '',
        s = fd,
        o = dd,
        y = hd,
        T = null;
      return (
        a != null &&
          (a.unstable_strictMode === !0 && (n = !0),
          a.identifierPrefix !== void 0 && (i = a.identifierPrefix),
          a.onUncaughtError !== void 0 && (s = a.onUncaughtError),
          a.onCaughtError !== void 0 && (o = a.onCaughtError),
          a.onRecoverableError !== void 0 && (y = a.onRecoverableError),
          a.formState !== void 0 && (T = a.formState)),
        (t = Vh(e, 1, !0, t, a ?? null, n, i, T, s, o, y, nm)),
        (t.context = Kh(null)),
        (a = t.current),
        (n = Mt()),
        (n = cr(n)),
        (i = Ha(n)),
        (i.callback = null),
        Ba(a, i, n),
        (a = n),
        (t.current.lanes = a),
        Tl(t, a),
        Pt(t),
        (e[Mn] = t.current),
        ec(e),
        new Hs(t)
      );
    }),
    (mi.version = '19.2.5'),
    mi
  );
}
var mm;
function Hb() {
  if (mm) return Ec.exports;
  mm = 1;
  function l() {
    if (
      !(
        typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > 'u' ||
        typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE != 'function'
      )
    )
      try {
        __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(l);
      } catch (r) {
        console.error(r);
      }
  }
  return (l(), (Ec.exports = kb()), Ec.exports);
}
var Bb = Hb();
const qb = $m(Bb);
/**
 * react-router v7.14.0
 *
 * Copyright (c) Remix Software Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.md file in the root directory of this source tree.
 *
 * @license MIT
 */ var ym = 'popstate';
function pm(l) {
  return (
    typeof l == 'object' &&
    l != null &&
    'pathname' in l &&
    'search' in l &&
    'hash' in l &&
    'state' in l &&
    'key' in l
  );
}
function Lb(l = {}) {
  function r(f, d) {
    let {
      pathname: m = '/',
      search: x = '',
      hash: p = '',
    } = _n(f.location.hash.substring(1));
    return (
      !m.startsWith('/') && !m.startsWith('.') && (m = '/' + m),
      Uc(
        '',
        { pathname: m, search: x, hash: p },
        (d.state && d.state.usr) || null,
        (d.state && d.state.key) || 'default',
      )
    );
  }
  function u(f, d) {
    let m = f.document.querySelector('base'),
      x = '';
    if (m && m.getAttribute('href')) {
      let p = f.location.href,
        v = p.indexOf('#');
      x = v === -1 ? p : p.slice(0, v);
    }
    return x + '#' + (typeof d == 'string' ? d : bi(d));
  }
  function c(f, d) {
    $t(
      f.pathname.charAt(0) === '/',
      `relative pathnames are not supported in hash history.push(${JSON.stringify(d)})`,
    );
  }
  return Gb(r, u, c, l);
}
function Ve(l, r) {
  if (l === !1 || l === null || typeof l > 'u') throw new Error(r);
}
function $t(l, r) {
  if (!l) {
    typeof console < 'u' && console.warn(r);
    try {
      throw new Error(r);
    } catch {}
  }
}
function Yb() {
  return Math.random().toString(36).substring(2, 10);
}
function gm(l, r) {
  return {
    usr: l.state,
    key: l.key,
    idx: r,
    masked: l.unstable_mask
      ? { pathname: l.pathname, search: l.search, hash: l.hash }
      : void 0,
  };
}
function Uc(l, r, u = null, c, f) {
  return {
    pathname: typeof l == 'string' ? l : l.pathname,
    search: '',
    hash: '',
    ...(typeof r == 'string' ? _n(r) : r),
    state: u,
    key: (r && r.key) || c || Yb(),
    unstable_mask: f,
  };
}
function bi({ pathname: l = '/', search: r = '', hash: u = '' }) {
  return (
    r && r !== '?' && (l += r.charAt(0) === '?' ? r : '?' + r),
    u && u !== '#' && (l += u.charAt(0) === '#' ? u : '#' + u),
    l
  );
}
function _n(l) {
  let r = {};
  if (l) {
    let u = l.indexOf('#');
    u >= 0 && ((r.hash = l.substring(u)), (l = l.substring(0, u)));
    let c = l.indexOf('?');
    (c >= 0 && ((r.search = l.substring(c)), (l = l.substring(0, c))),
      l && (r.pathname = l));
  }
  return r;
}
function Gb(l, r, u, c = {}) {
  let { window: f = document.defaultView, v5Compat: d = !1 } = c,
    m = f.history,
    x = 'POP',
    p = null,
    v = S();
  v == null && ((v = 0), m.replaceState({ ...m.state, idx: v }, ''));
  function S() {
    return (m.state || { idx: null }).idx;
  }
  function b() {
    x = 'POP';
    let D = S(),
      k = D == null ? null : D - v;
    ((v = D), p && p({ action: x, location: B.location, delta: k }));
  }
  function _(D, k) {
    x = 'PUSH';
    let te = pm(D) ? D : Uc(B.location, D, k);
    (u && u(te, D), (v = S() + 1));
    let F = gm(te, v),
      I = B.createHref(te.unstable_mask || te);
    try {
      m.pushState(F, '', I);
    } catch (ne) {
      if (ne instanceof DOMException && ne.name === 'DataCloneError') throw ne;
      f.location.assign(I);
    }
    d && p && p({ action: x, location: B.location, delta: 1 });
  }
  function V(D, k) {
    x = 'REPLACE';
    let te = pm(D) ? D : Uc(B.location, D, k);
    (u && u(te, D), (v = S()));
    let F = gm(te, v),
      I = B.createHref(te.unstable_mask || te);
    (m.replaceState(F, '', I),
      d && p && p({ action: x, location: B.location, delta: 0 }));
  }
  function G(D) {
    return Xb(D);
  }
  let B = {
    get action() {
      return x;
    },
    get location() {
      return l(f, m);
    },
    listen(D) {
      if (p) throw new Error('A history only accepts one active listener');
      return (
        f.addEventListener(ym, b),
        (p = D),
        () => {
          (f.removeEventListener(ym, b), (p = null));
        }
      );
    },
    createHref(D) {
      return r(f, D);
    },
    createURL: G,
    encodeLocation(D) {
      let k = G(D);
      return { pathname: k.pathname, search: k.search, hash: k.hash };
    },
    push: _,
    replace: V,
    go(D) {
      return m.go(D);
    },
  };
  return B;
}
function Xb(l, r = !1) {
  let u = 'http://localhost';
  (typeof window < 'u' &&
    (u =
      window.location.origin !== 'null'
        ? window.location.origin
        : window.location.href),
    Ve(u, 'No window.location.(origin|href) available to create URL'));
  let c = typeof l == 'string' ? l : bi(l);
  return (
    (c = c.replace(/ $/, '%20')),
    !r && c.startsWith('//') && (c = u + c),
    new URL(c, u)
  );
}
function Im(l, r, u = '/') {
  return Zb(l, r, u, !1);
}
function Zb(l, r, u, c) {
  let f = typeof r == 'string' ? _n(r) : r,
    d = Na(f.pathname || '/', u);
  if (d == null) return null;
  let m = Pm(l);
  Qb(m);
  let x = null;
  for (let p = 0; x == null && p < m.length; ++p) {
    let v = a0(d);
    x = e0(m[p], v, c);
  }
  return x;
}
function Pm(l, r = [], u = [], c = '', f = !1) {
  let d = (m, x, p = f, v) => {
    let S = {
      relativePath: v === void 0 ? m.path || '' : v,
      caseSensitive: m.caseSensitive === !0,
      childrenIndex: x,
      route: m,
    };
    if (S.relativePath.startsWith('/')) {
      if (!S.relativePath.startsWith(c) && p) return;
      (Ve(
        S.relativePath.startsWith(c),
        `Absolute route path "${S.relativePath}" nested under path "${c}" is not valid. An absolute child route path must start with the combined path of all its parent routes.`,
      ),
        (S.relativePath = S.relativePath.slice(c.length)));
    }
    let b = aa([c, S.relativePath]),
      _ = u.concat(S);
    (m.children &&
      m.children.length > 0 &&
      (Ve(
        m.index !== !0,
        `Index routes must not have child routes. Please remove all child routes from route path "${b}".`,
      ),
      Pm(m.children, r, _, b, p)),
      !(m.path == null && !m.index) &&
        r.push({ path: b, score: Ib(b, m.index), routesMeta: _ }));
  };
  return (
    l.forEach((m, x) => {
      var p;
      if (m.path === '' || !((p = m.path) != null && p.includes('?'))) d(m, x);
      else for (let v of ey(m.path)) d(m, x, !0, v);
    }),
    r
  );
}
function ey(l) {
  let r = l.split('/');
  if (r.length === 0) return [];
  let [u, ...c] = r,
    f = u.endsWith('?'),
    d = u.replace(/\?$/, '');
  if (c.length === 0) return f ? [d, ''] : [d];
  let m = ey(c.join('/')),
    x = [];
  return (
    x.push(...m.map((p) => (p === '' ? d : [d, p].join('/')))),
    f && x.push(...m),
    x.map((p) => (l.startsWith('/') && p === '' ? '/' : p))
  );
}
function Qb(l) {
  l.sort((r, u) =>
    r.score !== u.score
      ? u.score - r.score
      : Pb(
          r.routesMeta.map((c) => c.childrenIndex),
          u.routesMeta.map((c) => c.childrenIndex),
        ),
  );
}
var Vb = /^:[\w-]+$/,
  Kb = 3,
  Jb = 2,
  $b = 1,
  Wb = 10,
  Fb = -2,
  bm = (l) => l === '*';
function Ib(l, r) {
  let u = l.split('/'),
    c = u.length;
  return (
    u.some(bm) && (c += Fb),
    r && (c += Jb),
    u
      .filter((f) => !bm(f))
      .reduce((f, d) => f + (Vb.test(d) ? Kb : d === '' ? $b : Wb), c)
  );
}
function Pb(l, r) {
  return l.length === r.length && l.slice(0, -1).every((c, f) => c === r[f])
    ? l[l.length - 1] - r[r.length - 1]
    : 0;
}
function e0(l, r, u = !1) {
  let { routesMeta: c } = l,
    f = {},
    d = '/',
    m = [];
  for (let x = 0; x < c.length; ++x) {
    let p = c[x],
      v = x === c.length - 1,
      S = d === '/' ? r : r.slice(d.length) || '/',
      b = Js(
        { path: p.relativePath, caseSensitive: p.caseSensitive, end: v },
        S,
      ),
      _ = p.route;
    if (
      (!b &&
        v &&
        u &&
        !c[c.length - 1].route.index &&
        (b = Js(
          { path: p.relativePath, caseSensitive: p.caseSensitive, end: !1 },
          S,
        )),
      !b)
    )
      return null;
    (Object.assign(f, b.params),
      m.push({
        params: f,
        pathname: aa([d, b.pathname]),
        pathnameBase: s0(aa([d, b.pathnameBase])),
        route: _,
      }),
      b.pathnameBase !== '/' && (d = aa([d, b.pathnameBase])));
  }
  return m;
}
function Js(l, r) {
  typeof l == 'string' && (l = { path: l, caseSensitive: !1, end: !0 });
  let [u, c] = t0(l.path, l.caseSensitive, l.end),
    f = r.match(u);
  if (!f) return null;
  let d = f[0],
    m = d.replace(/(.)\/+$/, '$1'),
    x = f.slice(1);
  return {
    params: c.reduce((v, { paramName: S, isOptional: b }, _) => {
      if (S === '*') {
        let G = x[_] || '';
        m = d.slice(0, d.length - G.length).replace(/(.)\/+$/, '$1');
      }
      const V = x[_];
      return (
        b && !V ? (v[S] = void 0) : (v[S] = (V || '').replace(/%2F/g, '/')),
        v
      );
    }, {}),
    pathname: d,
    pathnameBase: m,
    pattern: l,
  };
}
function t0(l, r = !1, u = !0) {
  $t(
    l === '*' || !l.endsWith('*') || l.endsWith('/*'),
    `Route path "${l}" will be treated as if it were "${l.replace(/\*$/, '/*')}" because the \`*\` character must always follow a \`/\` in the pattern. To get rid of this warning, please change the route path to "${l.replace(/\*$/, '/*')}".`,
  );
  let c = [],
    f =
      '^' +
      l
        .replace(/\/*\*?$/, '')
        .replace(/^\/*/, '/')
        .replace(/[\\.*+^${}|()[\]]/g, '\\$&')
        .replace(/\/:([\w-]+)(\?)?/g, (m, x, p, v, S) => {
          if ((c.push({ paramName: x, isOptional: p != null }), p)) {
            let b = S.charAt(v + m.length);
            return b && b !== '/' ? '/([^\\/]*)' : '(?:/([^\\/]*))?';
          }
          return '/([^\\/]+)';
        })
        .replace(/\/([\w-]+)\?(\/|$)/g, '(/$1)?$2');
  return (
    l.endsWith('*')
      ? (c.push({ paramName: '*' }),
        (f += l === '*' || l === '/*' ? '(.*)$' : '(?:\\/(.+)|\\/*)$'))
      : u
        ? (f += '\\/*$')
        : l !== '' && l !== '/' && (f += '(?:(?=\\/|$))'),
    [new RegExp(f, r ? void 0 : 'i'), c]
  );
}
function a0(l) {
  try {
    return l
      .split('/')
      .map((r) => decodeURIComponent(r).replace(/\//g, '%2F'))
      .join('/');
  } catch (r) {
    return (
      $t(
        !1,
        `The URL path "${l}" could not be decoded because it is a malformed URL segment. This is probably due to a bad percent encoding (${r}).`,
      ),
      l
    );
  }
}
function Na(l, r) {
  if (r === '/') return l;
  if (!l.toLowerCase().startsWith(r.toLowerCase())) return null;
  let u = r.endsWith('/') ? r.length - 1 : r.length,
    c = l.charAt(u);
  return c && c !== '/' ? null : l.slice(u) || '/';
}
var n0 = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;
function l0(l, r = '/') {
  let {
      pathname: u,
      search: c = '',
      hash: f = '',
    } = typeof l == 'string' ? _n(l) : l,
    d;
  return (
    u
      ? ((u = u.replace(/\/\/+/g, '/')),
        u.startsWith('/') ? (d = vm(u.substring(1), '/')) : (d = vm(u, r)))
      : (d = r),
    { pathname: d, search: r0(c), hash: u0(f) }
  );
}
function vm(l, r) {
  let u = r.replace(/\/+$/, '').split('/');
  return (
    l.split('/').forEach((f) => {
      f === '..' ? u.length > 1 && u.pop() : f !== '.' && u.push(f);
    }),
    u.length > 1 ? u.join('/') : '/'
  );
}
function jc(l, r, u, c) {
  return `Cannot include a '${l}' character in a manually specified \`to.${r}\` field [${JSON.stringify(c)}].  Please separate it out to the \`to.${u}\` field. Alternatively you may provide the full path as a string in <Link to="..."> and the router will parse it for you.`;
}
function i0(l) {
  return l.filter(
    (r, u) => u === 0 || (r.route.path && r.route.path.length > 0),
  );
}
function ty(l) {
  let r = i0(l);
  return r.map((u, c) => (c === r.length - 1 ? u.pathname : u.pathnameBase));
}
function Zc(l, r, u, c = !1) {
  let f;
  typeof l == 'string'
    ? (f = _n(l))
    : ((f = { ...l }),
      Ve(
        !f.pathname || !f.pathname.includes('?'),
        jc('?', 'pathname', 'search', f),
      ),
      Ve(
        !f.pathname || !f.pathname.includes('#'),
        jc('#', 'pathname', 'hash', f),
      ),
      Ve(!f.search || !f.search.includes('#'), jc('#', 'search', 'hash', f)));
  let d = l === '' || f.pathname === '',
    m = d ? '/' : f.pathname,
    x;
  if (m == null) x = u;
  else {
    let b = r.length - 1;
    if (!c && m.startsWith('..')) {
      let _ = m.split('/');
      for (; _[0] === '..'; ) (_.shift(), (b -= 1));
      f.pathname = _.join('/');
    }
    x = b >= 0 ? r[b] : '/';
  }
  let p = l0(f, x),
    v = m && m !== '/' && m.endsWith('/'),
    S = (d || m === '.') && u.endsWith('/');
  return (!p.pathname.endsWith('/') && (v || S) && (p.pathname += '/'), p);
}
var aa = (l) => l.join('/').replace(/\/\/+/g, '/'),
  s0 = (l) => l.replace(/\/+$/, '').replace(/^\/*/, '/'),
  r0 = (l) => (!l || l === '?' ? '' : l.startsWith('?') ? l : '?' + l),
  u0 = (l) => (!l || l === '#' ? '' : l.startsWith('#') ? l : '#' + l),
  c0 = class {
    constructor(l, r, u, c = !1) {
      ((this.status = l),
        (this.statusText = r || ''),
        (this.internal = c),
        u instanceof Error
          ? ((this.data = u.toString()), (this.error = u))
          : (this.data = u));
    }
  };
function o0(l) {
  return (
    l != null &&
    typeof l.status == 'number' &&
    typeof l.statusText == 'string' &&
    typeof l.internal == 'boolean' &&
    'data' in l
  );
}
function f0(l) {
  return (
    l
      .map((r) => r.route.path)
      .filter(Boolean)
      .join('/')
      .replace(/\/\/*/g, '/') || '/'
  );
}
var ay =
  typeof window < 'u' &&
  typeof window.document < 'u' &&
  typeof window.document.createElement < 'u';
function ny(l, r) {
  let u = l;
  if (typeof u != 'string' || !n0.test(u))
    return { absoluteURL: void 0, isExternal: !1, to: u };
  let c = u,
    f = !1;
  if (ay)
    try {
      let d = new URL(window.location.href),
        m = u.startsWith('//') ? new URL(d.protocol + u) : new URL(u),
        x = Na(m.pathname, r);
      m.origin === d.origin && x != null
        ? (u = x + m.search + m.hash)
        : (f = !0);
    } catch {
      $t(
        !1,
        `<Link to="${u}"> contains an invalid URL which will probably break when clicked - please update to a valid URL path.`,
      );
    }
  return { absoluteURL: c, isExternal: f, to: u };
}
Object.getOwnPropertyNames(Object.prototype).sort().join('\0');
var ly = ['POST', 'PUT', 'PATCH', 'DELETE'];
new Set(ly);
var d0 = ['GET', ...ly];
new Set(d0);
var bl = E.createContext(null);
bl.displayName = 'DataRouter';
var nr = E.createContext(null);
nr.displayName = 'DataRouterState';
var iy = E.createContext(!1);
function h0() {
  return E.useContext(iy);
}
var sy = E.createContext({ isTransitioning: !1 });
sy.displayName = 'ViewTransition';
var m0 = E.createContext(new Map());
m0.displayName = 'Fetchers';
var y0 = E.createContext(null);
y0.displayName = 'Await';
var Qt = E.createContext(null);
Qt.displayName = 'Navigation';
var vi = E.createContext(null);
vi.displayName = 'Location';
var la = E.createContext({ outlet: null, matches: [], isDataRoute: !1 });
la.displayName = 'Route';
var Qc = E.createContext(null);
Qc.displayName = 'RouteError';
var ry = 'REACT_ROUTER_ERROR',
  p0 = 'REDIRECT',
  g0 = 'ROUTE_ERROR_RESPONSE';
function b0(l) {
  if (l.startsWith(`${ry}:${p0}:{`))
    try {
      let r = JSON.parse(l.slice(28));
      if (
        typeof r == 'object' &&
        r &&
        typeof r.status == 'number' &&
        typeof r.statusText == 'string' &&
        typeof r.location == 'string' &&
        typeof r.reloadDocument == 'boolean' &&
        typeof r.replace == 'boolean'
      )
        return r;
    } catch {}
}
function v0(l) {
  if (l.startsWith(`${ry}:${g0}:{`))
    try {
      let r = JSON.parse(l.slice(40));
      if (
        typeof r == 'object' &&
        r &&
        typeof r.status == 'number' &&
        typeof r.statusText == 'string'
      )
        return new c0(r.status, r.statusText, r.data);
    } catch {}
}
function x0(l, { relative: r } = {}) {
  Ve(
    xi(),
    'useHref() may be used only in the context of a <Router> component.',
  );
  let { basename: u, navigator: c } = E.useContext(Qt),
    { hash: f, pathname: d, search: m } = Si(l, { relative: r }),
    x = d;
  return (
    u !== '/' && (x = d === '/' ? u : aa([u, d])),
    c.createHref({ pathname: x, search: m, hash: f })
  );
}
function xi() {
  return E.useContext(vi) != null;
}
function Ra() {
  return (
    Ve(
      xi(),
      'useLocation() may be used only in the context of a <Router> component.',
    ),
    E.useContext(vi).location
  );
}
var uy =
  'You should call navigate() in a React.useEffect(), not when your component is first rendered.';
function cy(l) {
  E.useContext(Qt).static || E.useLayoutEffect(l);
}
function oy() {
  let { isDataRoute: l } = E.useContext(la);
  return l ? U0() : S0();
}
function S0() {
  Ve(
    xi(),
    'useNavigate() may be used only in the context of a <Router> component.',
  );
  let l = E.useContext(bl),
    { basename: r, navigator: u } = E.useContext(Qt),
    { matches: c } = E.useContext(la),
    { pathname: f } = Ra(),
    d = JSON.stringify(ty(c)),
    m = E.useRef(!1);
  return (
    cy(() => {
      m.current = !0;
    }),
    E.useCallback(
      (p, v = {}) => {
        if (($t(m.current, uy), !m.current)) return;
        if (typeof p == 'number') {
          u.go(p);
          return;
        }
        let S = Zc(p, JSON.parse(d), f, v.relative === 'path');
        (l == null &&
          r !== '/' &&
          (S.pathname = S.pathname === '/' ? r : aa([r, S.pathname])),
          (v.replace ? u.replace : u.push)(S, v.state, v));
      },
      [r, u, d, f, l],
    )
  );
}
var E0 = E.createContext(null);
function T0(l) {
  let r = E.useContext(la).outlet;
  return E.useMemo(
    () => r && E.createElement(E0.Provider, { value: l }, r),
    [r, l],
  );
}
function Si(l, { relative: r } = {}) {
  let { matches: u } = E.useContext(la),
    { pathname: c } = Ra(),
    f = JSON.stringify(ty(u));
  return E.useMemo(() => Zc(l, JSON.parse(f), c, r === 'path'), [l, f, c, r]);
}
function A0(l, r) {
  return fy(l, r);
}
function fy(l, r, u) {
  var D;
  Ve(
    xi(),
    'useRoutes() may be used only in the context of a <Router> component.',
  );
  let { navigator: c } = E.useContext(Qt),
    { matches: f } = E.useContext(la),
    d = f[f.length - 1],
    m = d ? d.params : {},
    x = d ? d.pathname : '/',
    p = d ? d.pathnameBase : '/',
    v = d && d.route;
  {
    let k = (v && v.path) || '';
    hy(
      x,
      !v || k.endsWith('*') || k.endsWith('*?'),
      `You rendered descendant <Routes> (or called \`useRoutes()\`) at "${x}" (under <Route path="${k}">) but the parent route path has no trailing "*". This means if you navigate deeper, the parent won't match anymore and therefore the child routes will never render.

Please change the parent <Route path="${k}"> to <Route path="${k === '/' ? '*' : `${k}/*`}">.`,
    );
  }
  let S = Ra(),
    b;
  if (r) {
    let k = typeof r == 'string' ? _n(r) : r;
    (Ve(
      p === '/' || ((D = k.pathname) == null ? void 0 : D.startsWith(p)),
      `When overriding the location using \`<Routes location>\` or \`useRoutes(routes, location)\`, the location pathname must begin with the portion of the URL pathname that was matched by all parent routes. The current pathname base is "${p}" but pathname "${k.pathname}" was given in the \`location\` prop.`,
    ),
      (b = k));
  } else b = S;
  let _ = b.pathname || '/',
    V = _;
  if (p !== '/') {
    let k = p.replace(/^\//, '').split('/');
    V = '/' + _.replace(/^\//, '').split('/').slice(k.length).join('/');
  }
  let G = Im(l, { pathname: V });
  ($t(
    v || G != null,
    `No routes matched location "${b.pathname}${b.search}${b.hash}" `,
  ),
    $t(
      G == null ||
        G[G.length - 1].route.element !== void 0 ||
        G[G.length - 1].route.Component !== void 0 ||
        G[G.length - 1].route.lazy !== void 0,
      `Matched leaf route at location "${b.pathname}${b.search}${b.hash}" does not have an element or Component. This means it will render an <Outlet /> with a null value by default resulting in an "empty" page.`,
    ));
  let B = z0(
    G &&
      G.map((k) =>
        Object.assign({}, k, {
          params: Object.assign({}, m, k.params),
          pathname: aa([
            p,
            c.encodeLocation
              ? c.encodeLocation(
                  k.pathname
                    .replace(/%/g, '%25')
                    .replace(/\?/g, '%3F')
                    .replace(/#/g, '%23'),
                ).pathname
              : k.pathname,
          ]),
          pathnameBase:
            k.pathnameBase === '/'
              ? p
              : aa([
                  p,
                  c.encodeLocation
                    ? c.encodeLocation(
                        k.pathnameBase
                          .replace(/%/g, '%25')
                          .replace(/\?/g, '%3F')
                          .replace(/#/g, '%23'),
                      ).pathname
                    : k.pathnameBase,
                ]),
        }),
      ),
    f,
    u,
  );
  return r && B
    ? E.createElement(
        vi.Provider,
        {
          value: {
            location: {
              pathname: '/',
              search: '',
              hash: '',
              state: null,
              key: 'default',
              unstable_mask: void 0,
              ...b,
            },
            navigationType: 'POP',
          },
        },
        B,
      )
    : B;
}
function w0() {
  let l = D0(),
    r = o0(l)
      ? `${l.status} ${l.statusText}`
      : l instanceof Error
        ? l.message
        : JSON.stringify(l),
    u = l instanceof Error ? l.stack : null,
    c = 'rgba(200,200,200, 0.5)',
    f = { padding: '0.5rem', backgroundColor: c },
    d = { padding: '2px 4px', backgroundColor: c },
    m = null;
  return (
    console.error('Error handled by React Router default ErrorBoundary:', l),
    (m = E.createElement(
      E.Fragment,
      null,
      E.createElement('p', null, '💿 Hey developer 👋'),
      E.createElement(
        'p',
        null,
        'You can provide a way better UX than this when your app throws errors by providing your own ',
        E.createElement('code', { style: d }, 'ErrorBoundary'),
        ' or',
        ' ',
        E.createElement('code', { style: d }, 'errorElement'),
        ' prop on your route.',
      ),
    )),
    E.createElement(
      E.Fragment,
      null,
      E.createElement('h2', null, 'Unexpected Application Error!'),
      E.createElement('h3', { style: { fontStyle: 'italic' } }, r),
      u ? E.createElement('pre', { style: f }, u) : null,
      m,
    )
  );
}
var j0 = E.createElement(w0, null),
  dy = class extends E.Component {
    constructor(l) {
      (super(l),
        (this.state = {
          location: l.location,
          revalidation: l.revalidation,
          error: l.error,
        }));
    }
    static getDerivedStateFromError(l) {
      return { error: l };
    }
    static getDerivedStateFromProps(l, r) {
      return r.location !== l.location ||
        (r.revalidation !== 'idle' && l.revalidation === 'idle')
        ? { error: l.error, location: l.location, revalidation: l.revalidation }
        : {
            error: l.error !== void 0 ? l.error : r.error,
            location: r.location,
            revalidation: l.revalidation || r.revalidation,
          };
    }
    componentDidCatch(l, r) {
      this.props.onError
        ? this.props.onError(l, r)
        : console.error(
            'React Router caught the following error during render',
            l,
          );
    }
    render() {
      let l = this.state.error;
      if (
        this.context &&
        typeof l == 'object' &&
        l &&
        'digest' in l &&
        typeof l.digest == 'string'
      ) {
        const u = v0(l.digest);
        u && (l = u);
      }
      let r =
        l !== void 0
          ? E.createElement(
              la.Provider,
              { value: this.props.routeContext },
              E.createElement(Qc.Provider, {
                value: l,
                children: this.props.component,
              }),
            )
          : this.props.children;
      return this.context ? E.createElement(N0, { error: l }, r) : r;
    }
  };
dy.contextType = iy;
var Nc = new WeakMap();
function N0({ children: l, error: r }) {
  let { basename: u } = E.useContext(Qt);
  if (
    typeof r == 'object' &&
    r &&
    'digest' in r &&
    typeof r.digest == 'string'
  ) {
    let c = b0(r.digest);
    if (c) {
      let f = Nc.get(r);
      if (f) throw f;
      let d = ny(c.location, u);
      if (ay && !Nc.get(r))
        if (d.isExternal || c.reloadDocument)
          window.location.href = d.absoluteURL || d.to;
        else {
          const m = Promise.resolve().then(() =>
            window.__reactRouterDataRouter.navigate(d.to, {
              replace: c.replace,
            }),
          );
          throw (Nc.set(r, m), m);
        }
      return E.createElement('meta', {
        httpEquiv: 'refresh',
        content: `0;url=${d.absoluteURL || d.to}`,
      });
    }
  }
  return l;
}
function R0({ routeContext: l, match: r, children: u }) {
  let c = E.useContext(bl);
  return (
    c &&
      c.static &&
      c.staticContext &&
      (r.route.errorElement || r.route.ErrorBoundary) &&
      (c.staticContext._deepestRenderedBoundaryId = r.route.id),
    E.createElement(la.Provider, { value: l }, u)
  );
}
function z0(l, r = [], u) {
  let c = u == null ? void 0 : u.state;
  if (l == null) {
    if (!c) return null;
    if (c.errors) l = c.matches;
    else if (r.length === 0 && !c.initialized && c.matches.length > 0)
      l = c.matches;
    else return null;
  }
  let f = l,
    d = c == null ? void 0 : c.errors;
  if (d != null) {
    let S = f.findIndex(
      (b) => b.route.id && (d == null ? void 0 : d[b.route.id]) !== void 0,
    );
    (Ve(
      S >= 0,
      `Could not find a matching route for errors on route IDs: ${Object.keys(d).join(',')}`,
    ),
      (f = f.slice(0, Math.min(f.length, S + 1))));
  }
  let m = !1,
    x = -1;
  if (u && c) {
    m = c.renderFallback;
    for (let S = 0; S < f.length; S++) {
      let b = f[S];
      if (
        ((b.route.HydrateFallback || b.route.hydrateFallbackElement) && (x = S),
        b.route.id)
      ) {
        let { loaderData: _, errors: V } = c,
          G =
            b.route.loader &&
            !_.hasOwnProperty(b.route.id) &&
            (!V || V[b.route.id] === void 0);
        if (b.route.lazy || G) {
          (u.isStatic && (m = !0),
            x >= 0 ? (f = f.slice(0, x + 1)) : (f = [f[0]]));
          break;
        }
      }
    }
  }
  let p = u == null ? void 0 : u.onError,
    v =
      c && p
        ? (S, b) => {
            var _, V;
            p(S, {
              location: c.location,
              params:
                ((V = (_ = c.matches) == null ? void 0 : _[0]) == null
                  ? void 0
                  : V.params) ?? {},
              unstable_pattern: f0(c.matches),
              errorInfo: b,
            });
          }
        : void 0;
  return f.reduceRight((S, b, _) => {
    let V,
      G = !1,
      B = null,
      D = null;
    c &&
      ((V = d && b.route.id ? d[b.route.id] : void 0),
      (B = b.route.errorElement || j0),
      m &&
        (x < 0 && _ === 0
          ? (hy(
              'route-fallback',
              !1,
              'No `HydrateFallback` element provided to render during initial hydration',
            ),
            (G = !0),
            (D = null))
          : x === _ &&
            ((G = !0), (D = b.route.hydrateFallbackElement || null))));
    let k = r.concat(f.slice(0, _ + 1)),
      te = () => {
        let F;
        return (
          V
            ? (F = B)
            : G
              ? (F = D)
              : b.route.Component
                ? (F = E.createElement(b.route.Component, null))
                : b.route.element
                  ? (F = b.route.element)
                  : (F = S),
          E.createElement(R0, {
            match: b,
            routeContext: { outlet: S, matches: k, isDataRoute: c != null },
            children: F,
          })
        );
      };
    return c && (b.route.ErrorBoundary || b.route.errorElement || _ === 0)
      ? E.createElement(dy, {
          location: c.location,
          revalidation: c.revalidation,
          component: B,
          error: V,
          children: te(),
          routeContext: { outlet: null, matches: k, isDataRoute: !0 },
          onError: v,
        })
      : te();
  }, null);
}
function Vc(l) {
  return `${l} must be used within a data router.  See https://reactrouter.com/en/main/routers/picking-a-router.`;
}
function _0(l) {
  let r = E.useContext(bl);
  return (Ve(r, Vc(l)), r);
}
function O0(l) {
  let r = E.useContext(nr);
  return (Ve(r, Vc(l)), r);
}
function C0(l) {
  let r = E.useContext(la);
  return (Ve(r, Vc(l)), r);
}
function Kc(l) {
  let r = C0(l),
    u = r.matches[r.matches.length - 1];
  return (
    Ve(
      u.route.id,
      `${l} can only be used on routes that contain a unique "id"`,
    ),
    u.route.id
  );
}
function M0() {
  return Kc('useRouteId');
}
function D0() {
  var c;
  let l = E.useContext(Qc),
    r = O0('useRouteError'),
    u = Kc('useRouteError');
  return l !== void 0 ? l : (c = r.errors) == null ? void 0 : c[u];
}
function U0() {
  let { router: l } = _0('useNavigate'),
    r = Kc('useNavigate'),
    u = E.useRef(!1);
  return (
    cy(() => {
      u.current = !0;
    }),
    E.useCallback(
      async (f, d = {}) => {
        ($t(u.current, uy),
          u.current &&
            (typeof f == 'number'
              ? await l.navigate(f)
              : await l.navigate(f, { fromRouteId: r, ...d })));
      },
      [l, r],
    )
  );
}
var xm = {};
function hy(l, r, u) {
  !r && !xm[l] && ((xm[l] = !0), $t(!1, u));
}
E.memo(k0);
function k0({ routes: l, future: r, state: u, isStatic: c, onError: f }) {
  return fy(l, void 0, { state: u, isStatic: c, onError: f });
}
function H0(l) {
  return T0(l.context);
}
function ja(l) {
  Ve(
    !1,
    'A <Route> is only ever to be used as the child of <Routes> element, never rendered directly. Please wrap your <Route> in a <Routes>.',
  );
}
function B0({
  basename: l = '/',
  children: r = null,
  location: u,
  navigationType: c = 'POP',
  navigator: f,
  static: d = !1,
  unstable_useTransitions: m,
}) {
  Ve(
    !xi(),
    'You cannot render a <Router> inside another <Router>. You should never have more than one in your app.',
  );
  let x = l.replace(/^\/*/, '/'),
    p = E.useMemo(
      () => ({
        basename: x,
        navigator: f,
        static: d,
        unstable_useTransitions: m,
        future: {},
      }),
      [x, f, d, m],
    );
  typeof u == 'string' && (u = _n(u));
  let {
      pathname: v = '/',
      search: S = '',
      hash: b = '',
      state: _ = null,
      key: V = 'default',
      unstable_mask: G,
    } = u,
    B = E.useMemo(() => {
      let D = Na(v, x);
      return D == null
        ? null
        : {
            location: {
              pathname: D,
              search: S,
              hash: b,
              state: _,
              key: V,
              unstable_mask: G,
            },
            navigationType: c,
          };
    }, [x, v, S, b, _, V, c, G]);
  return (
    $t(
      B != null,
      `<Router basename="${x}"> is not able to match the URL "${v}${S}${b}" because it does not start with the basename, so the <Router> won't render anything.`,
    ),
    B == null
      ? null
      : E.createElement(
          Qt.Provider,
          { value: p },
          E.createElement(vi.Provider, { children: r, value: B }),
        )
  );
}
function q0({ children: l, location: r }) {
  return A0(kc(l), r);
}
function kc(l, r = []) {
  let u = [];
  return (
    E.Children.forEach(l, (c, f) => {
      if (!E.isValidElement(c)) return;
      let d = [...r, f];
      if (c.type === E.Fragment) {
        u.push.apply(u, kc(c.props.children, d));
        return;
      }
      (Ve(
        c.type === ja,
        `[${typeof c.type == 'string' ? c.type : c.type.name}] is not a <Route> component. All component children of <Routes> must be a <Route> or <React.Fragment>`,
      ),
        Ve(
          !c.props.index || !c.props.children,
          'An index route cannot have child routes.',
        ));
      let m = {
        id: c.props.id || d.join('-'),
        caseSensitive: c.props.caseSensitive,
        element: c.props.element,
        Component: c.props.Component,
        index: c.props.index,
        path: c.props.path,
        middleware: c.props.middleware,
        loader: c.props.loader,
        action: c.props.action,
        hydrateFallbackElement: c.props.hydrateFallbackElement,
        HydrateFallback: c.props.HydrateFallback,
        errorElement: c.props.errorElement,
        ErrorBoundary: c.props.ErrorBoundary,
        hasErrorBoundary:
          c.props.hasErrorBoundary === !0 ||
          c.props.ErrorBoundary != null ||
          c.props.errorElement != null,
        shouldRevalidate: c.props.shouldRevalidate,
        handle: c.props.handle,
        lazy: c.props.lazy,
      };
      (c.props.children && (m.children = kc(c.props.children, d)), u.push(m));
    }),
    u
  );
}
var Gs = 'get',
  Xs = 'application/x-www-form-urlencoded';
function lr(l) {
  return typeof HTMLElement < 'u' && l instanceof HTMLElement;
}
function L0(l) {
  return lr(l) && l.tagName.toLowerCase() === 'button';
}
function Y0(l) {
  return lr(l) && l.tagName.toLowerCase() === 'form';
}
function G0(l) {
  return lr(l) && l.tagName.toLowerCase() === 'input';
}
function X0(l) {
  return !!(l.metaKey || l.altKey || l.ctrlKey || l.shiftKey);
}
function Z0(l, r) {
  return l.button === 0 && (!r || r === '_self') && !X0(l);
}
var qs = null;
function Q0() {
  if (qs === null)
    try {
      (new FormData(document.createElement('form'), 0), (qs = !1));
    } catch {
      qs = !0;
    }
  return qs;
}
var V0 = new Set([
  'application/x-www-form-urlencoded',
  'multipart/form-data',
  'text/plain',
]);
function Rc(l) {
  return l != null && !V0.has(l)
    ? ($t(
        !1,
        `"${l}" is not a valid \`encType\` for \`<Form>\`/\`<fetcher.Form>\` and will default to "${Xs}"`,
      ),
      null)
    : l;
}
function K0(l, r) {
  let u, c, f, d, m;
  if (Y0(l)) {
    let x = l.getAttribute('action');
    ((c = x ? Na(x, r) : null),
      (u = l.getAttribute('method') || Gs),
      (f = Rc(l.getAttribute('enctype')) || Xs),
      (d = new FormData(l)));
  } else if (L0(l) || (G0(l) && (l.type === 'submit' || l.type === 'image'))) {
    let x = l.form;
    if (x == null)
      throw new Error(
        'Cannot submit a <button> or <input type="submit"> without a <form>',
      );
    let p = l.getAttribute('formaction') || x.getAttribute('action');
    if (
      ((c = p ? Na(p, r) : null),
      (u = l.getAttribute('formmethod') || x.getAttribute('method') || Gs),
      (f =
        Rc(l.getAttribute('formenctype')) ||
        Rc(x.getAttribute('enctype')) ||
        Xs),
      (d = new FormData(x, l)),
      !Q0())
    ) {
      let { name: v, type: S, value: b } = l;
      if (S === 'image') {
        let _ = v ? `${v}.` : '';
        (d.append(`${_}x`, '0'), d.append(`${_}y`, '0'));
      } else v && d.append(v, b);
    }
  } else {
    if (lr(l))
      throw new Error(
        'Cannot submit element that is not <form>, <button>, or <input type="submit|image">',
      );
    ((u = Gs), (c = null), (f = Xs), (m = l));
  }
  return (
    d && f === 'text/plain' && ((m = d), (d = void 0)),
    { action: c, method: u.toLowerCase(), encType: f, formData: d, body: m }
  );
}
Object.getOwnPropertyNames(Object.prototype).sort().join('\0');
function Jc(l, r) {
  if (l === !1 || l === null || typeof l > 'u') throw new Error(r);
}
function my(l, r, u, c) {
  let f =
    typeof l == 'string'
      ? new URL(
          l,
          typeof window > 'u'
            ? 'server://singlefetch/'
            : window.location.origin,
        )
      : l;
  return (
    u
      ? f.pathname.endsWith('/')
        ? (f.pathname = `${f.pathname}_.${c}`)
        : (f.pathname = `${f.pathname}.${c}`)
      : f.pathname === '/'
        ? (f.pathname = `_root.${c}`)
        : r && Na(f.pathname, r) === '/'
          ? (f.pathname = `${r.replace(/\/$/, '')}/_root.${c}`)
          : (f.pathname = `${f.pathname.replace(/\/$/, '')}.${c}`),
    f
  );
}
async function J0(l, r) {
  if (l.id in r) return r[l.id];
  try {
    let u = await import(l.module);
    return ((r[l.id] = u), u);
  } catch (u) {
    return (
      console.error(
        `Error loading route module \`${l.module}\`, reloading page...`,
      ),
      console.error(u),
      window.__reactRouterContext && window.__reactRouterContext.isSpaMode,
      window.location.reload(),
      new Promise(() => {})
    );
  }
}
function $0(l) {
  return l == null
    ? !1
    : l.href == null
      ? l.rel === 'preload' &&
        typeof l.imageSrcSet == 'string' &&
        typeof l.imageSizes == 'string'
      : typeof l.rel == 'string' && typeof l.href == 'string';
}
async function W0(l, r, u) {
  let c = await Promise.all(
    l.map(async (f) => {
      let d = r.routes[f.route.id];
      if (d) {
        let m = await J0(d, u);
        return m.links ? m.links() : [];
      }
      return [];
    }),
  );
  return ev(
    c
      .flat(1)
      .filter($0)
      .filter((f) => f.rel === 'stylesheet' || f.rel === 'preload')
      .map((f) =>
        f.rel === 'stylesheet'
          ? { ...f, rel: 'prefetch', as: 'style' }
          : { ...f, rel: 'prefetch' },
      ),
  );
}
function Sm(l, r, u, c, f, d) {
  let m = (p, v) => (u[v] ? p.route.id !== u[v].route.id : !0),
    x = (p, v) => {
      var S;
      return (
        u[v].pathname !== p.pathname ||
        (((S = u[v].route.path) == null ? void 0 : S.endsWith('*')) &&
          u[v].params['*'] !== p.params['*'])
      );
    };
  return d === 'assets'
    ? r.filter((p, v) => m(p, v) || x(p, v))
    : d === 'data'
      ? r.filter((p, v) => {
          var b;
          let S = c.routes[p.route.id];
          if (!S || !S.hasLoader) return !1;
          if (m(p, v) || x(p, v)) return !0;
          if (p.route.shouldRevalidate) {
            let _ = p.route.shouldRevalidate({
              currentUrl: new URL(
                f.pathname + f.search + f.hash,
                window.origin,
              ),
              currentParams: ((b = u[0]) == null ? void 0 : b.params) || {},
              nextUrl: new URL(l, window.origin),
              nextParams: p.params,
              defaultShouldRevalidate: !0,
            });
            if (typeof _ == 'boolean') return _;
          }
          return !0;
        })
      : [];
}
function F0(l, r, { includeHydrateFallback: u } = {}) {
  return I0(
    l
      .map((c) => {
        let f = r.routes[c.route.id];
        if (!f) return [];
        let d = [f.module];
        return (
          f.clientActionModule && (d = d.concat(f.clientActionModule)),
          f.clientLoaderModule && (d = d.concat(f.clientLoaderModule)),
          u &&
            f.hydrateFallbackModule &&
            (d = d.concat(f.hydrateFallbackModule)),
          f.imports && (d = d.concat(f.imports)),
          d
        );
      })
      .flat(1),
  );
}
function I0(l) {
  return [...new Set(l)];
}
function P0(l) {
  let r = {},
    u = Object.keys(l).sort();
  for (let c of u) r[c] = l[c];
  return r;
}
function ev(l, r) {
  let u = new Set();
  return (
    new Set(r),
    l.reduce((c, f) => {
      let d = JSON.stringify(P0(f));
      return (u.has(d) || (u.add(d), c.push({ key: d, link: f })), c);
    }, [])
  );
}
function $c() {
  let l = E.useContext(bl);
  return (
    Jc(
      l,
      'You must render this element inside a <DataRouterContext.Provider> element',
    ),
    l
  );
}
function tv() {
  let l = E.useContext(nr);
  return (
    Jc(
      l,
      'You must render this element inside a <DataRouterStateContext.Provider> element',
    ),
    l
  );
}
var Wc = E.createContext(void 0);
Wc.displayName = 'FrameworkContext';
function Fc() {
  let l = E.useContext(Wc);
  return (
    Jc(l, 'You must render this element inside a <HydratedRouter> element'),
    l
  );
}
function av(l, r) {
  let u = E.useContext(Wc),
    [c, f] = E.useState(!1),
    [d, m] = E.useState(!1),
    {
      onFocus: x,
      onBlur: p,
      onMouseEnter: v,
      onMouseLeave: S,
      onTouchStart: b,
    } = r,
    _ = E.useRef(null);
  (E.useEffect(() => {
    if ((l === 'render' && m(!0), l === 'viewport')) {
      let B = (k) => {
          k.forEach((te) => {
            m(te.isIntersecting);
          });
        },
        D = new IntersectionObserver(B, { threshold: 0.5 });
      return (
        _.current && D.observe(_.current),
        () => {
          D.disconnect();
        }
      );
    }
  }, [l]),
    E.useEffect(() => {
      if (c) {
        let B = setTimeout(() => {
          m(!0);
        }, 100);
        return () => {
          clearTimeout(B);
        };
      }
    }, [c]));
  let V = () => {
      f(!0);
    },
    G = () => {
      (f(!1), m(!1));
    };
  return u
    ? l !== 'intent'
      ? [d, _, {}]
      : [
          d,
          _,
          {
            onFocus: yi(x, V),
            onBlur: yi(p, G),
            onMouseEnter: yi(v, V),
            onMouseLeave: yi(S, G),
            onTouchStart: yi(b, V),
          },
        ]
    : [!1, _, {}];
}
function yi(l, r) {
  return (u) => {
    (l && l(u), u.defaultPrevented || r(u));
  };
}
function nv({ page: l, ...r }) {
  let u = h0(),
    { router: c } = $c(),
    f = E.useMemo(() => Im(c.routes, l, c.basename), [c.routes, l, c.basename]);
  return f
    ? u
      ? E.createElement(iv, { page: l, matches: f, ...r })
      : E.createElement(sv, { page: l, matches: f, ...r })
    : null;
}
function lv(l) {
  let { manifest: r, routeModules: u } = Fc(),
    [c, f] = E.useState([]);
  return (
    E.useEffect(() => {
      let d = !1;
      return (
        W0(l, r, u).then((m) => {
          d || f(m);
        }),
        () => {
          d = !0;
        }
      );
    }, [l, r, u]),
    c
  );
}
function iv({ page: l, matches: r, ...u }) {
  let c = Ra(),
    { future: f } = Fc(),
    { basename: d } = $c(),
    m = E.useMemo(() => {
      if (l === c.pathname + c.search + c.hash) return [];
      let x = my(l, d, f.unstable_trailingSlashAwareDataRequests, 'rsc'),
        p = !1,
        v = [];
      for (let S of r)
        typeof S.route.shouldRevalidate == 'function'
          ? (p = !0)
          : v.push(S.route.id);
      return (
        p && v.length > 0 && x.searchParams.set('_routes', v.join(',')),
        [x.pathname + x.search]
      );
    }, [d, f.unstable_trailingSlashAwareDataRequests, l, c, r]);
  return E.createElement(
    E.Fragment,
    null,
    m.map((x) =>
      E.createElement('link', {
        key: x,
        rel: 'prefetch',
        as: 'fetch',
        href: x,
        ...u,
      }),
    ),
  );
}
function sv({ page: l, matches: r, ...u }) {
  let c = Ra(),
    { future: f, manifest: d, routeModules: m } = Fc(),
    { basename: x } = $c(),
    { loaderData: p, matches: v } = tv(),
    S = E.useMemo(() => Sm(l, r, v, d, c, 'data'), [l, r, v, d, c]),
    b = E.useMemo(() => Sm(l, r, v, d, c, 'assets'), [l, r, v, d, c]),
    _ = E.useMemo(() => {
      if (l === c.pathname + c.search + c.hash) return [];
      let B = new Set(),
        D = !1;
      if (
        (r.forEach((te) => {
          var I;
          let F = d.routes[te.route.id];
          !F ||
            !F.hasLoader ||
            ((!S.some((ne) => ne.route.id === te.route.id) &&
              te.route.id in p &&
              (I = m[te.route.id]) != null &&
              I.shouldRevalidate) ||
            F.hasClientLoader
              ? (D = !0)
              : B.add(te.route.id));
        }),
        B.size === 0)
      )
        return [];
      let k = my(l, x, f.unstable_trailingSlashAwareDataRequests, 'data');
      return (
        D &&
          B.size > 0 &&
          k.searchParams.set(
            '_routes',
            r
              .filter((te) => B.has(te.route.id))
              .map((te) => te.route.id)
              .join(','),
          ),
        [k.pathname + k.search]
      );
    }, [x, f.unstable_trailingSlashAwareDataRequests, p, c, d, S, r, l, m]),
    V = E.useMemo(() => F0(b, d), [b, d]),
    G = lv(b);
  return E.createElement(
    E.Fragment,
    null,
    _.map((B) =>
      E.createElement('link', {
        key: B,
        rel: 'prefetch',
        as: 'fetch',
        href: B,
        ...u,
      }),
    ),
    V.map((B) =>
      E.createElement('link', { key: B, rel: 'modulepreload', href: B, ...u }),
    ),
    G.map(({ key: B, link: D }) =>
      E.createElement('link', {
        key: B,
        nonce: u.nonce,
        ...D,
        crossOrigin: D.crossOrigin ?? u.crossOrigin,
      }),
    ),
  );
}
function rv(...l) {
  return (r) => {
    l.forEach((u) => {
      typeof u == 'function' ? u(r) : u != null && (u.current = r);
    });
  };
}
var uv =
  typeof window < 'u' &&
  typeof window.document < 'u' &&
  typeof window.document.createElement < 'u';
try {
  uv && (window.__reactRouterVersion = '7.14.0');
} catch {}
function cv({
  basename: l,
  children: r,
  unstable_useTransitions: u,
  window: c,
}) {
  let f = E.useRef();
  f.current == null && (f.current = Lb({ window: c, v5Compat: !0 }));
  let d = f.current,
    [m, x] = E.useState({ action: d.action, location: d.location }),
    p = E.useCallback(
      (v) => {
        u === !1 ? x(v) : E.startTransition(() => x(v));
      },
      [u],
    );
  return (
    E.useLayoutEffect(() => d.listen(p), [d, p]),
    E.createElement(B0, {
      basename: l,
      children: r,
      location: m.location,
      navigationType: m.action,
      navigator: d,
      unstable_useTransitions: u,
    })
  );
}
var yy = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i,
  $s = E.forwardRef(function (
    {
      onClick: r,
      discover: u = 'render',
      prefetch: c = 'none',
      relative: f,
      reloadDocument: d,
      replace: m,
      unstable_mask: x,
      state: p,
      target: v,
      to: S,
      preventScrollReset: b,
      viewTransition: _,
      unstable_defaultShouldRevalidate: V,
      ...G
    },
    B,
  ) {
    let {
        basename: D,
        navigator: k,
        unstable_useTransitions: te,
      } = E.useContext(Qt),
      F = typeof S == 'string' && yy.test(S),
      I = ny(S, D);
    S = I.to;
    let ne = x0(S, { relative: f }),
      W = Ra(),
      J = null;
    if (x) {
      let ae = Zc(x, [], W.unstable_mask ? W.unstable_mask.pathname : '/', !0);
      (D !== '/' &&
        (ae.pathname = ae.pathname === '/' ? D : aa([D, ae.pathname])),
        (J = k.createHref(ae)));
    }
    let [Z, ye, Ye] = av(c, G),
      Re = dv(S, {
        replace: m,
        unstable_mask: x,
        state: p,
        target: v,
        preventScrollReset: b,
        relative: f,
        viewTransition: _,
        unstable_defaultShouldRevalidate: V,
        unstable_useTransitions: te,
      });
    function Ee(ae) {
      (r && r(ae), ae.defaultPrevented || Re(ae));
    }
    let De = !(I.isExternal || d),
      Be = E.createElement('a', {
        ...G,
        ...Ye,
        href: (De ? J : void 0) || I.absoluteURL || ne,
        onClick: De ? Ee : r,
        ref: rv(B, ye),
        target: v,
        'data-discover': !F && u === 'render' ? 'true' : void 0,
      });
    return Z && !F
      ? E.createElement(E.Fragment, null, Be, E.createElement(nv, { page: ne }))
      : Be;
  });
$s.displayName = 'Link';
var py = E.forwardRef(function (
  {
    'aria-current': r = 'page',
    caseSensitive: u = !1,
    className: c = '',
    end: f = !1,
    style: d,
    to: m,
    viewTransition: x,
    children: p,
    ...v
  },
  S,
) {
  let b = Si(m, { relative: v.relative }),
    _ = Ra(),
    V = E.useContext(nr),
    { navigator: G, basename: B } = E.useContext(Qt),
    D = V != null && gv(b) && x === !0,
    k = G.encodeLocation ? G.encodeLocation(b).pathname : b.pathname,
    te = _.pathname,
    F =
      V && V.navigation && V.navigation.location
        ? V.navigation.location.pathname
        : null;
  (u ||
    ((te = te.toLowerCase()),
    (F = F ? F.toLowerCase() : null),
    (k = k.toLowerCase())),
    F && B && (F = Na(F, B) || F));
  const I = k !== '/' && k.endsWith('/') ? k.length - 1 : k.length;
  let ne = te === k || (!f && te.startsWith(k) && te.charAt(I) === '/'),
    W =
      F != null &&
      (F === k || (!f && F.startsWith(k) && F.charAt(k.length) === '/')),
    J = { isActive: ne, isPending: W, isTransitioning: D },
    Z = ne ? r : void 0,
    ye;
  typeof c == 'function'
    ? (ye = c(J))
    : (ye = [
        c,
        ne ? 'active' : null,
        W ? 'pending' : null,
        D ? 'transitioning' : null,
      ]
        .filter(Boolean)
        .join(' '));
  let Ye = typeof d == 'function' ? d(J) : d;
  return E.createElement(
    $s,
    {
      ...v,
      'aria-current': Z,
      className: ye,
      ref: S,
      style: Ye,
      to: m,
      viewTransition: x,
    },
    typeof p == 'function' ? p(J) : p,
  );
});
py.displayName = 'NavLink';
var ov = E.forwardRef(
  (
    {
      discover: l = 'render',
      fetcherKey: r,
      navigate: u,
      reloadDocument: c,
      replace: f,
      state: d,
      method: m = Gs,
      action: x,
      onSubmit: p,
      relative: v,
      preventScrollReset: S,
      viewTransition: b,
      unstable_defaultShouldRevalidate: _,
      ...V
    },
    G,
  ) => {
    let { unstable_useTransitions: B } = E.useContext(Qt),
      D = yv(),
      k = pv(x, { relative: v }),
      te = m.toLowerCase() === 'get' ? 'get' : 'post',
      F = typeof x == 'string' && yy.test(x),
      I = (ne) => {
        if ((p && p(ne), ne.defaultPrevented)) return;
        ne.preventDefault();
        let W = ne.nativeEvent.submitter,
          J = (W == null ? void 0 : W.getAttribute('formmethod')) || m,
          Z = () =>
            D(W || ne.currentTarget, {
              fetcherKey: r,
              method: J,
              navigate: u,
              replace: f,
              state: d,
              relative: v,
              preventScrollReset: S,
              viewTransition: b,
              unstable_defaultShouldRevalidate: _,
            });
        B && u !== !1 ? E.startTransition(() => Z()) : Z();
      };
    return E.createElement('form', {
      ref: G,
      method: te,
      action: k,
      onSubmit: c ? p : I,
      ...V,
      'data-discover': !F && l === 'render' ? 'true' : void 0,
    });
  },
);
ov.displayName = 'Form';
function fv(l) {
  return `${l} must be used within a data router.  See https://reactrouter.com/en/main/routers/picking-a-router.`;
}
function gy(l) {
  let r = E.useContext(bl);
  return (Ve(r, fv(l)), r);
}
function dv(
  l,
  {
    target: r,
    replace: u,
    unstable_mask: c,
    state: f,
    preventScrollReset: d,
    relative: m,
    viewTransition: x,
    unstable_defaultShouldRevalidate: p,
    unstable_useTransitions: v,
  } = {},
) {
  let S = oy(),
    b = Ra(),
    _ = Si(l, { relative: m });
  return E.useCallback(
    (V) => {
      if (Z0(V, r)) {
        V.preventDefault();
        let G = u !== void 0 ? u : bi(b) === bi(_),
          B = () =>
            S(l, {
              replace: G,
              unstable_mask: c,
              state: f,
              preventScrollReset: d,
              relative: m,
              viewTransition: x,
              unstable_defaultShouldRevalidate: p,
            });
        v ? E.startTransition(() => B()) : B();
      }
    },
    [b, S, _, u, c, f, r, l, d, m, x, p, v],
  );
}
var hv = 0,
  mv = () => `__${String(++hv)}__`;
function yv() {
  let { router: l } = gy('useSubmit'),
    { basename: r } = E.useContext(Qt),
    u = M0(),
    c = l.fetch,
    f = l.navigate;
  return E.useCallback(
    async (d, m = {}) => {
      let { action: x, method: p, encType: v, formData: S, body: b } = K0(d, r);
      if (m.navigate === !1) {
        let _ = m.fetcherKey || mv();
        await c(_, u, m.action || x, {
          unstable_defaultShouldRevalidate: m.unstable_defaultShouldRevalidate,
          preventScrollReset: m.preventScrollReset,
          formData: S,
          body: b,
          formMethod: m.method || p,
          formEncType: m.encType || v,
          flushSync: m.flushSync,
        });
      } else
        await f(m.action || x, {
          unstable_defaultShouldRevalidate: m.unstable_defaultShouldRevalidate,
          preventScrollReset: m.preventScrollReset,
          formData: S,
          body: b,
          formMethod: m.method || p,
          formEncType: m.encType || v,
          replace: m.replace,
          state: m.state,
          fromRouteId: u,
          flushSync: m.flushSync,
          viewTransition: m.viewTransition,
        });
    },
    [c, f, r, u],
  );
}
function pv(l, { relative: r } = {}) {
  let { basename: u } = E.useContext(Qt),
    c = E.useContext(la);
  Ve(c, 'useFormAction must be used inside a RouteContext');
  let [f] = c.matches.slice(-1),
    d = { ...Si(l || '.', { relative: r }) },
    m = Ra();
  if (l == null) {
    d.search = m.search;
    let x = new URLSearchParams(d.search),
      p = x.getAll('index');
    if (p.some((S) => S === '')) {
      (x.delete('index'),
        p.filter((b) => b).forEach((b) => x.append('index', b)));
      let S = x.toString();
      d.search = S ? `?${S}` : '';
    }
  }
  return (
    (!l || l === '.') &&
      f.route.index &&
      (d.search = d.search ? d.search.replace(/^\?/, '?index&') : '?index'),
    u !== '/' && (d.pathname = d.pathname === '/' ? u : aa([u, d.pathname])),
    bi(d)
  );
}
function gv(l, { relative: r } = {}) {
  let u = E.useContext(sy);
  Ve(
    u != null,
    "`useViewTransitionState` must be used within `react-router-dom`'s `RouterProvider`.  Did you accidentally import `RouterProvider` from `react-router`?",
  );
  let { basename: c } = gy('useViewTransitionState'),
    f = Si(l, { relative: r });
  if (!u.isTransitioning) return !1;
  let d = Na(u.currentLocation.pathname, c) || u.currentLocation.pathname,
    m = Na(u.nextLocation.pathname, c) || u.nextLocation.pathname;
  return Js(f.pathname, m) != null || Js(f.pathname, d) != null;
}
Fm();
function by(l) {
  var r,
    u,
    c = '';
  if (typeof l == 'string' || typeof l == 'number') c += l;
  else if (typeof l == 'object')
    if (Array.isArray(l)) {
      var f = l.length;
      for (r = 0; r < f; r++)
        l[r] && (u = by(l[r])) && (c && (c += ' '), (c += u));
    } else for (u in l) l[u] && (c && (c += ' '), (c += u));
  return c;
}
function bv() {
  for (var l, r, u = 0, c = '', f = arguments.length; u < f; u++)
    (l = arguments[u]) && (r = by(l)) && (c && (c += ' '), (c += r));
  return c;
}
const vv = (l, r) => {
    const u = new Array(l.length + r.length);
    for (let c = 0; c < l.length; c++) u[c] = l[c];
    for (let c = 0; c < r.length; c++) u[l.length + c] = r[c];
    return u;
  },
  xv = (l, r) => ({ classGroupId: l, validator: r }),
  vy = (l = new Map(), r = null, u) => ({
    nextPart: l,
    validators: r,
    classGroupId: u,
  }),
  Ws = '-',
  Em = [],
  Sv = 'arbitrary..',
  Ev = (l) => {
    const r = Av(l),
      { conflictingClassGroups: u, conflictingClassGroupModifiers: c } = l;
    return {
      getClassGroupId: (m) => {
        if (m.startsWith('[') && m.endsWith(']')) return Tv(m);
        const x = m.split(Ws),
          p = x[0] === '' && x.length > 1 ? 1 : 0;
        return xy(x, p, r);
      },
      getConflictingClassGroupIds: (m, x) => {
        if (x) {
          const p = c[m],
            v = u[m];
          return p ? (v ? vv(v, p) : p) : v || Em;
        }
        return u[m] || Em;
      },
    };
  },
  xy = (l, r, u) => {
    if (l.length - r === 0) return u.classGroupId;
    const f = l[r],
      d = u.nextPart.get(f);
    if (d) {
      const v = xy(l, r + 1, d);
      if (v) return v;
    }
    const m = u.validators;
    if (m === null) return;
    const x = r === 0 ? l.join(Ws) : l.slice(r).join(Ws),
      p = m.length;
    for (let v = 0; v < p; v++) {
      const S = m[v];
      if (S.validator(x)) return S.classGroupId;
    }
  },
  Tv = (l) =>
    l.slice(1, -1).indexOf(':') === -1
      ? void 0
      : (() => {
          const r = l.slice(1, -1),
            u = r.indexOf(':'),
            c = r.slice(0, u);
          return c ? Sv + c : void 0;
        })(),
  Av = (l) => {
    const { theme: r, classGroups: u } = l;
    return wv(u, r);
  },
  wv = (l, r) => {
    const u = vy();
    for (const c in l) {
      const f = l[c];
      Ic(f, u, c, r);
    }
    return u;
  },
  Ic = (l, r, u, c) => {
    const f = l.length;
    for (let d = 0; d < f; d++) {
      const m = l[d];
      jv(m, r, u, c);
    }
  },
  jv = (l, r, u, c) => {
    if (typeof l == 'string') {
      Nv(l, r, u);
      return;
    }
    if (typeof l == 'function') {
      Rv(l, r, u, c);
      return;
    }
    zv(l, r, u, c);
  },
  Nv = (l, r, u) => {
    const c = l === '' ? r : Sy(r, l);
    c.classGroupId = u;
  },
  Rv = (l, r, u, c) => {
    if (_v(l)) {
      Ic(l(c), r, u, c);
      return;
    }
    (r.validators === null && (r.validators = []), r.validators.push(xv(u, l)));
  },
  zv = (l, r, u, c) => {
    const f = Object.entries(l),
      d = f.length;
    for (let m = 0; m < d; m++) {
      const [x, p] = f[m];
      Ic(p, Sy(r, x), u, c);
    }
  },
  Sy = (l, r) => {
    let u = l;
    const c = r.split(Ws),
      f = c.length;
    for (let d = 0; d < f; d++) {
      const m = c[d];
      let x = u.nextPart.get(m);
      (x || ((x = vy()), u.nextPart.set(m, x)), (u = x));
    }
    return u;
  },
  _v = (l) => 'isThemeGetter' in l && l.isThemeGetter === !0,
  Ov = (l) => {
    if (l < 1) return { get: () => {}, set: () => {} };
    let r = 0,
      u = Object.create(null),
      c = Object.create(null);
    const f = (d, m) => {
      ((u[d] = m), r++, r > l && ((r = 0), (c = u), (u = Object.create(null))));
    };
    return {
      get(d) {
        let m = u[d];
        if (m !== void 0) return m;
        if ((m = c[d]) !== void 0) return (f(d, m), m);
      },
      set(d, m) {
        d in u ? (u[d] = m) : f(d, m);
      },
    };
  },
  Hc = '!',
  Tm = ':',
  Cv = [],
  Am = (l, r, u, c, f) => ({
    modifiers: l,
    hasImportantModifier: r,
    baseClassName: u,
    maybePostfixModifierPosition: c,
    isExternal: f,
  }),
  Mv = (l) => {
    const { prefix: r, experimentalParseClassName: u } = l;
    let c = (f) => {
      const d = [];
      let m = 0,
        x = 0,
        p = 0,
        v;
      const S = f.length;
      for (let B = 0; B < S; B++) {
        const D = f[B];
        if (m === 0 && x === 0) {
          if (D === Tm) {
            (d.push(f.slice(p, B)), (p = B + 1));
            continue;
          }
          if (D === '/') {
            v = B;
            continue;
          }
        }
        D === '[' ? m++ : D === ']' ? m-- : D === '(' ? x++ : D === ')' && x--;
      }
      const b = d.length === 0 ? f : f.slice(p);
      let _ = b,
        V = !1;
      b.endsWith(Hc)
        ? ((_ = b.slice(0, -1)), (V = !0))
        : b.startsWith(Hc) && ((_ = b.slice(1)), (V = !0));
      const G = v && v > p ? v - p : void 0;
      return Am(d, V, _, G);
    };
    if (r) {
      const f = r + Tm,
        d = c;
      c = (m) =>
        m.startsWith(f) ? d(m.slice(f.length)) : Am(Cv, !1, m, void 0, !0);
    }
    if (u) {
      const f = c;
      c = (d) => u({ className: d, parseClassName: f });
    }
    return c;
  },
  Dv = (l) => {
    const r = new Map();
    return (
      l.orderSensitiveModifiers.forEach((u, c) => {
        r.set(u, 1e6 + c);
      }),
      (u) => {
        const c = [];
        let f = [];
        for (let d = 0; d < u.length; d++) {
          const m = u[d],
            x = m[0] === '[',
            p = r.has(m);
          x || p
            ? (f.length > 0 && (f.sort(), c.push(...f), (f = [])), c.push(m))
            : f.push(m);
        }
        return (f.length > 0 && (f.sort(), c.push(...f)), c);
      }
    );
  },
  Uv = (l) => ({
    cache: Ov(l.cacheSize),
    parseClassName: Mv(l),
    sortModifiers: Dv(l),
    ...Ev(l),
  }),
  kv = /\s+/,
  Hv = (l, r) => {
    const {
        parseClassName: u,
        getClassGroupId: c,
        getConflictingClassGroupIds: f,
        sortModifiers: d,
      } = r,
      m = [],
      x = l.trim().split(kv);
    let p = '';
    for (let v = x.length - 1; v >= 0; v -= 1) {
      const S = x[v],
        {
          isExternal: b,
          modifiers: _,
          hasImportantModifier: V,
          baseClassName: G,
          maybePostfixModifierPosition: B,
        } = u(S);
      if (b) {
        p = S + (p.length > 0 ? ' ' + p : p);
        continue;
      }
      let D = !!B,
        k = c(D ? G.substring(0, B) : G);
      if (!k) {
        if (!D) {
          p = S + (p.length > 0 ? ' ' + p : p);
          continue;
        }
        if (((k = c(G)), !k)) {
          p = S + (p.length > 0 ? ' ' + p : p);
          continue;
        }
        D = !1;
      }
      const te = _.length === 0 ? '' : _.length === 1 ? _[0] : d(_).join(':'),
        F = V ? te + Hc : te,
        I = F + k;
      if (m.indexOf(I) > -1) continue;
      m.push(I);
      const ne = f(k, D);
      for (let W = 0; W < ne.length; ++W) {
        const J = ne[W];
        m.push(F + J);
      }
      p = S + (p.length > 0 ? ' ' + p : p);
    }
    return p;
  },
  Bv = (...l) => {
    let r = 0,
      u,
      c,
      f = '';
    for (; r < l.length; )
      (u = l[r++]) && (c = Ey(u)) && (f && (f += ' '), (f += c));
    return f;
  },
  Ey = (l) => {
    if (typeof l == 'string') return l;
    let r,
      u = '';
    for (let c = 0; c < l.length; c++)
      l[c] && (r = Ey(l[c])) && (u && (u += ' '), (u += r));
    return u;
  },
  qv = (l, ...r) => {
    let u, c, f, d;
    const m = (p) => {
        const v = r.reduce((S, b) => b(S), l());
        return (
          (u = Uv(v)),
          (c = u.cache.get),
          (f = u.cache.set),
          (d = x),
          x(p)
        );
      },
      x = (p) => {
        const v = c(p);
        if (v) return v;
        const S = Hv(p, u);
        return (f(p, S), S);
      };
    return ((d = m), (...p) => d(Bv(...p)));
  },
  Lv = [],
  lt = (l) => {
    const r = (u) => u[l] || Lv;
    return ((r.isThemeGetter = !0), r);
  },
  Ty = /^\[(?:(\w[\w-]*):)?(.+)\]$/i,
  Ay = /^\((?:(\w[\w-]*):)?(.+)\)$/i,
  Yv = /^\d+(?:\.\d+)?\/\d+(?:\.\d+)?$/,
  Gv = /^(\d+(\.\d+)?)?(xs|sm|md|lg|xl)$/,
  Xv =
    /\d+(%|px|r?em|[sdl]?v([hwib]|min|max)|pt|pc|in|cm|mm|cap|ch|ex|r?lh|cq(w|h|i|b|min|max))|\b(calc|min|max|clamp)\(.+\)|^0$/,
  Zv = /^(rgba?|hsla?|hwb|(ok)?(lab|lch)|color-mix)\(.+\)$/,
  Qv = /^(inset_)?-?((\d+)?\.?(\d+)[a-z]+|0)_-?((\d+)?\.?(\d+)[a-z]+|0)/,
  Vv =
    /^(url|image|image-set|cross-fade|element|(repeating-)?(linear|radial|conic)-gradient)\(.+\)$/,
  tn = (l) => Yv.test(l),
  Se = (l) => !!l && !Number.isNaN(Number(l)),
  an = (l) => !!l && Number.isInteger(Number(l)),
  zc = (l) => l.endsWith('%') && Se(l.slice(0, -1)),
  Aa = (l) => Gv.test(l),
  wy = () => !0,
  Kv = (l) => Xv.test(l) && !Zv.test(l),
  Pc = () => !1,
  Jv = (l) => Qv.test(l),
  $v = (l) => Vv.test(l),
  Wv = (l) => !se(l) && !ue(l),
  Fv = (l) => nn(l, Ry, Pc),
  se = (l) => Ty.test(l),
  jn = (l) => nn(l, zy, Kv),
  wm = (l) => nn(l, ix, Se),
  Iv = (l) => nn(l, Oy, wy),
  Pv = (l) => nn(l, _y, Pc),
  jm = (l) => nn(l, jy, Pc),
  ex = (l) => nn(l, Ny, $v),
  Ls = (l) => nn(l, Cy, Jv),
  ue = (l) => Ay.test(l),
  pi = (l) => On(l, zy),
  tx = (l) => On(l, _y),
  Nm = (l) => On(l, jy),
  ax = (l) => On(l, Ry),
  nx = (l) => On(l, Ny),
  Ys = (l) => On(l, Cy, !0),
  lx = (l) => On(l, Oy, !0),
  nn = (l, r, u) => {
    const c = Ty.exec(l);
    return c ? (c[1] ? r(c[1]) : u(c[2])) : !1;
  },
  On = (l, r, u = !1) => {
    const c = Ay.exec(l);
    return c ? (c[1] ? r(c[1]) : u) : !1;
  },
  jy = (l) => l === 'position' || l === 'percentage',
  Ny = (l) => l === 'image' || l === 'url',
  Ry = (l) => l === 'length' || l === 'size' || l === 'bg-size',
  zy = (l) => l === 'length',
  ix = (l) => l === 'number',
  _y = (l) => l === 'family-name',
  Oy = (l) => l === 'number' || l === 'weight',
  Cy = (l) => l === 'shadow',
  sx = () => {
    const l = lt('color'),
      r = lt('font'),
      u = lt('text'),
      c = lt('font-weight'),
      f = lt('tracking'),
      d = lt('leading'),
      m = lt('breakpoint'),
      x = lt('container'),
      p = lt('spacing'),
      v = lt('radius'),
      S = lt('shadow'),
      b = lt('inset-shadow'),
      _ = lt('text-shadow'),
      V = lt('drop-shadow'),
      G = lt('blur'),
      B = lt('perspective'),
      D = lt('aspect'),
      k = lt('ease'),
      te = lt('animate'),
      F = () => [
        'auto',
        'avoid',
        'all',
        'avoid-page',
        'page',
        'left',
        'right',
        'column',
      ],
      I = () => [
        'center',
        'top',
        'bottom',
        'left',
        'right',
        'top-left',
        'left-top',
        'top-right',
        'right-top',
        'bottom-right',
        'right-bottom',
        'bottom-left',
        'left-bottom',
      ],
      ne = () => [...I(), ue, se],
      W = () => ['auto', 'hidden', 'clip', 'visible', 'scroll'],
      J = () => ['auto', 'contain', 'none'],
      Z = () => [ue, se, p],
      ye = () => [tn, 'full', 'auto', ...Z()],
      Ye = () => [an, 'none', 'subgrid', ue, se],
      Re = () => ['auto', { span: ['full', an, ue, se] }, an, ue, se],
      Ee = () => [an, 'auto', ue, se],
      De = () => ['auto', 'min', 'max', 'fr', ue, se],
      Be = () => [
        'start',
        'end',
        'center',
        'between',
        'around',
        'evenly',
        'stretch',
        'baseline',
        'center-safe',
        'end-safe',
      ],
      ae = () => [
        'start',
        'end',
        'center',
        'stretch',
        'center-safe',
        'end-safe',
      ],
      z = () => ['auto', ...Z()],
      q = () => [
        tn,
        'auto',
        'full',
        'dvw',
        'dvh',
        'lvw',
        'lvh',
        'svw',
        'svh',
        'min',
        'max',
        'fit',
        ...Z(),
      ],
      le = () => [
        tn,
        'screen',
        'full',
        'dvw',
        'lvw',
        'svw',
        'min',
        'max',
        'fit',
        ...Z(),
      ],
      ce = () => [
        tn,
        'screen',
        'full',
        'lh',
        'dvh',
        'lvh',
        'svh',
        'min',
        'max',
        'fit',
        ...Z(),
      ],
      $ = () => [l, ue, se],
      w = () => [...I(), Nm, jm, { position: [ue, se] }],
      g = () => ['no-repeat', { repeat: ['', 'x', 'y', 'space', 'round'] }],
      A = () => ['auto', 'cover', 'contain', ax, Fv, { size: [ue, se] }],
      N = () => [zc, pi, jn],
      Q = () => ['', 'none', 'full', v, ue, se],
      K = () => ['', Se, pi, jn],
      P = () => ['solid', 'dashed', 'dotted', 'double'],
      fe = () => [
        'normal',
        'multiply',
        'screen',
        'overlay',
        'darken',
        'lighten',
        'color-dodge',
        'color-burn',
        'hard-light',
        'soft-light',
        'difference',
        'exclusion',
        'hue',
        'saturation',
        'color',
        'luminosity',
      ],
      Y = () => [Se, zc, Nm, jm],
      ee = () => ['', 'none', G, ue, se],
      xe = () => ['none', Se, ue, se],
      Ke = () => ['none', Se, ue, se],
      pe = () => [Se, ue, se],
      he = () => [tn, 'full', ...Z()];
    return {
      cacheSize: 500,
      theme: {
        animate: ['spin', 'ping', 'pulse', 'bounce'],
        aspect: ['video'],
        blur: [Aa],
        breakpoint: [Aa],
        color: [wy],
        container: [Aa],
        'drop-shadow': [Aa],
        ease: ['in', 'out', 'in-out'],
        font: [Wv],
        'font-weight': [
          'thin',
          'extralight',
          'light',
          'normal',
          'medium',
          'semibold',
          'bold',
          'extrabold',
          'black',
        ],
        'inset-shadow': [Aa],
        leading: ['none', 'tight', 'snug', 'normal', 'relaxed', 'loose'],
        perspective: [
          'dramatic',
          'near',
          'normal',
          'midrange',
          'distant',
          'none',
        ],
        radius: [Aa],
        shadow: [Aa],
        spacing: ['px', Se],
        text: [Aa],
        'text-shadow': [Aa],
        tracking: ['tighter', 'tight', 'normal', 'wide', 'wider', 'widest'],
      },
      classGroups: {
        aspect: [{ aspect: ['auto', 'square', tn, se, ue, D] }],
        container: ['container'],
        columns: [{ columns: [Se, se, ue, x] }],
        'break-after': [{ 'break-after': F() }],
        'break-before': [{ 'break-before': F() }],
        'break-inside': [
          { 'break-inside': ['auto', 'avoid', 'avoid-page', 'avoid-column'] },
        ],
        'box-decoration': [{ 'box-decoration': ['slice', 'clone'] }],
        box: [{ box: ['border', 'content'] }],
        display: [
          'block',
          'inline-block',
          'inline',
          'flex',
          'inline-flex',
          'table',
          'inline-table',
          'table-caption',
          'table-cell',
          'table-column',
          'table-column-group',
          'table-footer-group',
          'table-header-group',
          'table-row-group',
          'table-row',
          'flow-root',
          'grid',
          'inline-grid',
          'contents',
          'list-item',
          'hidden',
        ],
        sr: ['sr-only', 'not-sr-only'],
        float: [{ float: ['right', 'left', 'none', 'start', 'end'] }],
        clear: [{ clear: ['left', 'right', 'both', 'none', 'start', 'end'] }],
        isolation: ['isolate', 'isolation-auto'],
        'object-fit': [
          { object: ['contain', 'cover', 'fill', 'none', 'scale-down'] },
        ],
        'object-position': [{ object: ne() }],
        overflow: [{ overflow: W() }],
        'overflow-x': [{ 'overflow-x': W() }],
        'overflow-y': [{ 'overflow-y': W() }],
        overscroll: [{ overscroll: J() }],
        'overscroll-x': [{ 'overscroll-x': J() }],
        'overscroll-y': [{ 'overscroll-y': J() }],
        position: ['static', 'fixed', 'absolute', 'relative', 'sticky'],
        inset: [{ inset: ye() }],
        'inset-x': [{ 'inset-x': ye() }],
        'inset-y': [{ 'inset-y': ye() }],
        start: [{ 'inset-s': ye(), start: ye() }],
        end: [{ 'inset-e': ye(), end: ye() }],
        'inset-bs': [{ 'inset-bs': ye() }],
        'inset-be': [{ 'inset-be': ye() }],
        top: [{ top: ye() }],
        right: [{ right: ye() }],
        bottom: [{ bottom: ye() }],
        left: [{ left: ye() }],
        visibility: ['visible', 'invisible', 'collapse'],
        z: [{ z: [an, 'auto', ue, se] }],
        basis: [{ basis: [tn, 'full', 'auto', x, ...Z()] }],
        'flex-direction': [
          { flex: ['row', 'row-reverse', 'col', 'col-reverse'] },
        ],
        'flex-wrap': [{ flex: ['nowrap', 'wrap', 'wrap-reverse'] }],
        flex: [{ flex: [Se, tn, 'auto', 'initial', 'none', se] }],
        grow: [{ grow: ['', Se, ue, se] }],
        shrink: [{ shrink: ['', Se, ue, se] }],
        order: [{ order: [an, 'first', 'last', 'none', ue, se] }],
        'grid-cols': [{ 'grid-cols': Ye() }],
        'col-start-end': [{ col: Re() }],
        'col-start': [{ 'col-start': Ee() }],
        'col-end': [{ 'col-end': Ee() }],
        'grid-rows': [{ 'grid-rows': Ye() }],
        'row-start-end': [{ row: Re() }],
        'row-start': [{ 'row-start': Ee() }],
        'row-end': [{ 'row-end': Ee() }],
        'grid-flow': [
          { 'grid-flow': ['row', 'col', 'dense', 'row-dense', 'col-dense'] },
        ],
        'auto-cols': [{ 'auto-cols': De() }],
        'auto-rows': [{ 'auto-rows': De() }],
        gap: [{ gap: Z() }],
        'gap-x': [{ 'gap-x': Z() }],
        'gap-y': [{ 'gap-y': Z() }],
        'justify-content': [{ justify: [...Be(), 'normal'] }],
        'justify-items': [{ 'justify-items': [...ae(), 'normal'] }],
        'justify-self': [{ 'justify-self': ['auto', ...ae()] }],
        'align-content': [{ content: ['normal', ...Be()] }],
        'align-items': [{ items: [...ae(), { baseline: ['', 'last'] }] }],
        'align-self': [{ self: ['auto', ...ae(), { baseline: ['', 'last'] }] }],
        'place-content': [{ 'place-content': Be() }],
        'place-items': [{ 'place-items': [...ae(), 'baseline'] }],
        'place-self': [{ 'place-self': ['auto', ...ae()] }],
        p: [{ p: Z() }],
        px: [{ px: Z() }],
        py: [{ py: Z() }],
        ps: [{ ps: Z() }],
        pe: [{ pe: Z() }],
        pbs: [{ pbs: Z() }],
        pbe: [{ pbe: Z() }],
        pt: [{ pt: Z() }],
        pr: [{ pr: Z() }],
        pb: [{ pb: Z() }],
        pl: [{ pl: Z() }],
        m: [{ m: z() }],
        mx: [{ mx: z() }],
        my: [{ my: z() }],
        ms: [{ ms: z() }],
        me: [{ me: z() }],
        mbs: [{ mbs: z() }],
        mbe: [{ mbe: z() }],
        mt: [{ mt: z() }],
        mr: [{ mr: z() }],
        mb: [{ mb: z() }],
        ml: [{ ml: z() }],
        'space-x': [{ 'space-x': Z() }],
        'space-x-reverse': ['space-x-reverse'],
        'space-y': [{ 'space-y': Z() }],
        'space-y-reverse': ['space-y-reverse'],
        size: [{ size: q() }],
        'inline-size': [{ inline: ['auto', ...le()] }],
        'min-inline-size': [{ 'min-inline': ['auto', ...le()] }],
        'max-inline-size': [{ 'max-inline': ['none', ...le()] }],
        'block-size': [{ block: ['auto', ...ce()] }],
        'min-block-size': [{ 'min-block': ['auto', ...ce()] }],
        'max-block-size': [{ 'max-block': ['none', ...ce()] }],
        w: [{ w: [x, 'screen', ...q()] }],
        'min-w': [{ 'min-w': [x, 'screen', 'none', ...q()] }],
        'max-w': [
          { 'max-w': [x, 'screen', 'none', 'prose', { screen: [m] }, ...q()] },
        ],
        h: [{ h: ['screen', 'lh', ...q()] }],
        'min-h': [{ 'min-h': ['screen', 'lh', 'none', ...q()] }],
        'max-h': [{ 'max-h': ['screen', 'lh', ...q()] }],
        'font-size': [{ text: ['base', u, pi, jn] }],
        'font-smoothing': ['antialiased', 'subpixel-antialiased'],
        'font-style': ['italic', 'not-italic'],
        'font-weight': [{ font: [c, lx, Iv] }],
        'font-stretch': [
          {
            'font-stretch': [
              'ultra-condensed',
              'extra-condensed',
              'condensed',
              'semi-condensed',
              'normal',
              'semi-expanded',
              'expanded',
              'extra-expanded',
              'ultra-expanded',
              zc,
              se,
            ],
          },
        ],
        'font-family': [{ font: [tx, Pv, r] }],
        'font-features': [{ 'font-features': [se] }],
        'fvn-normal': ['normal-nums'],
        'fvn-ordinal': ['ordinal'],
        'fvn-slashed-zero': ['slashed-zero'],
        'fvn-figure': ['lining-nums', 'oldstyle-nums'],
        'fvn-spacing': ['proportional-nums', 'tabular-nums'],
        'fvn-fraction': ['diagonal-fractions', 'stacked-fractions'],
        tracking: [{ tracking: [f, ue, se] }],
        'line-clamp': [{ 'line-clamp': [Se, 'none', ue, wm] }],
        leading: [{ leading: [d, ...Z()] }],
        'list-image': [{ 'list-image': ['none', ue, se] }],
        'list-style-position': [{ list: ['inside', 'outside'] }],
        'list-style-type': [{ list: ['disc', 'decimal', 'none', ue, se] }],
        'text-alignment': [
          { text: ['left', 'center', 'right', 'justify', 'start', 'end'] },
        ],
        'placeholder-color': [{ placeholder: $() }],
        'text-color': [{ text: $() }],
        'text-decoration': [
          'underline',
          'overline',
          'line-through',
          'no-underline',
        ],
        'text-decoration-style': [{ decoration: [...P(), 'wavy'] }],
        'text-decoration-thickness': [
          { decoration: [Se, 'from-font', 'auto', ue, jn] },
        ],
        'text-decoration-color': [{ decoration: $() }],
        'underline-offset': [{ 'underline-offset': [Se, 'auto', ue, se] }],
        'text-transform': [
          'uppercase',
          'lowercase',
          'capitalize',
          'normal-case',
        ],
        'text-overflow': ['truncate', 'text-ellipsis', 'text-clip'],
        'text-wrap': [{ text: ['wrap', 'nowrap', 'balance', 'pretty'] }],
        indent: [{ indent: Z() }],
        'vertical-align': [
          {
            align: [
              'baseline',
              'top',
              'middle',
              'bottom',
              'text-top',
              'text-bottom',
              'sub',
              'super',
              ue,
              se,
            ],
          },
        ],
        whitespace: [
          {
            whitespace: [
              'normal',
              'nowrap',
              'pre',
              'pre-line',
              'pre-wrap',
              'break-spaces',
            ],
          },
        ],
        break: [{ break: ['normal', 'words', 'all', 'keep'] }],
        wrap: [{ wrap: ['break-word', 'anywhere', 'normal'] }],
        hyphens: [{ hyphens: ['none', 'manual', 'auto'] }],
        content: [{ content: ['none', ue, se] }],
        'bg-attachment': [{ bg: ['fixed', 'local', 'scroll'] }],
        'bg-clip': [{ 'bg-clip': ['border', 'padding', 'content', 'text'] }],
        'bg-origin': [{ 'bg-origin': ['border', 'padding', 'content'] }],
        'bg-position': [{ bg: w() }],
        'bg-repeat': [{ bg: g() }],
        'bg-size': [{ bg: A() }],
        'bg-image': [
          {
            bg: [
              'none',
              {
                linear: [
                  { to: ['t', 'tr', 'r', 'br', 'b', 'bl', 'l', 'tl'] },
                  an,
                  ue,
                  se,
                ],
                radial: ['', ue, se],
                conic: [an, ue, se],
              },
              nx,
              ex,
            ],
          },
        ],
        'bg-color': [{ bg: $() }],
        'gradient-from-pos': [{ from: N() }],
        'gradient-via-pos': [{ via: N() }],
        'gradient-to-pos': [{ to: N() }],
        'gradient-from': [{ from: $() }],
        'gradient-via': [{ via: $() }],
        'gradient-to': [{ to: $() }],
        rounded: [{ rounded: Q() }],
        'rounded-s': [{ 'rounded-s': Q() }],
        'rounded-e': [{ 'rounded-e': Q() }],
        'rounded-t': [{ 'rounded-t': Q() }],
        'rounded-r': [{ 'rounded-r': Q() }],
        'rounded-b': [{ 'rounded-b': Q() }],
        'rounded-l': [{ 'rounded-l': Q() }],
        'rounded-ss': [{ 'rounded-ss': Q() }],
        'rounded-se': [{ 'rounded-se': Q() }],
        'rounded-ee': [{ 'rounded-ee': Q() }],
        'rounded-es': [{ 'rounded-es': Q() }],
        'rounded-tl': [{ 'rounded-tl': Q() }],
        'rounded-tr': [{ 'rounded-tr': Q() }],
        'rounded-br': [{ 'rounded-br': Q() }],
        'rounded-bl': [{ 'rounded-bl': Q() }],
        'border-w': [{ border: K() }],
        'border-w-x': [{ 'border-x': K() }],
        'border-w-y': [{ 'border-y': K() }],
        'border-w-s': [{ 'border-s': K() }],
        'border-w-e': [{ 'border-e': K() }],
        'border-w-bs': [{ 'border-bs': K() }],
        'border-w-be': [{ 'border-be': K() }],
        'border-w-t': [{ 'border-t': K() }],
        'border-w-r': [{ 'border-r': K() }],
        'border-w-b': [{ 'border-b': K() }],
        'border-w-l': [{ 'border-l': K() }],
        'divide-x': [{ 'divide-x': K() }],
        'divide-x-reverse': ['divide-x-reverse'],
        'divide-y': [{ 'divide-y': K() }],
        'divide-y-reverse': ['divide-y-reverse'],
        'border-style': [{ border: [...P(), 'hidden', 'none'] }],
        'divide-style': [{ divide: [...P(), 'hidden', 'none'] }],
        'border-color': [{ border: $() }],
        'border-color-x': [{ 'border-x': $() }],
        'border-color-y': [{ 'border-y': $() }],
        'border-color-s': [{ 'border-s': $() }],
        'border-color-e': [{ 'border-e': $() }],
        'border-color-bs': [{ 'border-bs': $() }],
        'border-color-be': [{ 'border-be': $() }],
        'border-color-t': [{ 'border-t': $() }],
        'border-color-r': [{ 'border-r': $() }],
        'border-color-b': [{ 'border-b': $() }],
        'border-color-l': [{ 'border-l': $() }],
        'divide-color': [{ divide: $() }],
        'outline-style': [{ outline: [...P(), 'none', 'hidden'] }],
        'outline-offset': [{ 'outline-offset': [Se, ue, se] }],
        'outline-w': [{ outline: ['', Se, pi, jn] }],
        'outline-color': [{ outline: $() }],
        shadow: [{ shadow: ['', 'none', S, Ys, Ls] }],
        'shadow-color': [{ shadow: $() }],
        'inset-shadow': [{ 'inset-shadow': ['none', b, Ys, Ls] }],
        'inset-shadow-color': [{ 'inset-shadow': $() }],
        'ring-w': [{ ring: K() }],
        'ring-w-inset': ['ring-inset'],
        'ring-color': [{ ring: $() }],
        'ring-offset-w': [{ 'ring-offset': [Se, jn] }],
        'ring-offset-color': [{ 'ring-offset': $() }],
        'inset-ring-w': [{ 'inset-ring': K() }],
        'inset-ring-color': [{ 'inset-ring': $() }],
        'text-shadow': [{ 'text-shadow': ['none', _, Ys, Ls] }],
        'text-shadow-color': [{ 'text-shadow': $() }],
        opacity: [{ opacity: [Se, ue, se] }],
        'mix-blend': [
          { 'mix-blend': [...fe(), 'plus-darker', 'plus-lighter'] },
        ],
        'bg-blend': [{ 'bg-blend': fe() }],
        'mask-clip': [
          {
            'mask-clip': [
              'border',
              'padding',
              'content',
              'fill',
              'stroke',
              'view',
            ],
          },
          'mask-no-clip',
        ],
        'mask-composite': [
          { mask: ['add', 'subtract', 'intersect', 'exclude'] },
        ],
        'mask-image-linear-pos': [{ 'mask-linear': [Se] }],
        'mask-image-linear-from-pos': [{ 'mask-linear-from': Y() }],
        'mask-image-linear-to-pos': [{ 'mask-linear-to': Y() }],
        'mask-image-linear-from-color': [{ 'mask-linear-from': $() }],
        'mask-image-linear-to-color': [{ 'mask-linear-to': $() }],
        'mask-image-t-from-pos': [{ 'mask-t-from': Y() }],
        'mask-image-t-to-pos': [{ 'mask-t-to': Y() }],
        'mask-image-t-from-color': [{ 'mask-t-from': $() }],
        'mask-image-t-to-color': [{ 'mask-t-to': $() }],
        'mask-image-r-from-pos': [{ 'mask-r-from': Y() }],
        'mask-image-r-to-pos': [{ 'mask-r-to': Y() }],
        'mask-image-r-from-color': [{ 'mask-r-from': $() }],
        'mask-image-r-to-color': [{ 'mask-r-to': $() }],
        'mask-image-b-from-pos': [{ 'mask-b-from': Y() }],
        'mask-image-b-to-pos': [{ 'mask-b-to': Y() }],
        'mask-image-b-from-color': [{ 'mask-b-from': $() }],
        'mask-image-b-to-color': [{ 'mask-b-to': $() }],
        'mask-image-l-from-pos': [{ 'mask-l-from': Y() }],
        'mask-image-l-to-pos': [{ 'mask-l-to': Y() }],
        'mask-image-l-from-color': [{ 'mask-l-from': $() }],
        'mask-image-l-to-color': [{ 'mask-l-to': $() }],
        'mask-image-x-from-pos': [{ 'mask-x-from': Y() }],
        'mask-image-x-to-pos': [{ 'mask-x-to': Y() }],
        'mask-image-x-from-color': [{ 'mask-x-from': $() }],
        'mask-image-x-to-color': [{ 'mask-x-to': $() }],
        'mask-image-y-from-pos': [{ 'mask-y-from': Y() }],
        'mask-image-y-to-pos': [{ 'mask-y-to': Y() }],
        'mask-image-y-from-color': [{ 'mask-y-from': $() }],
        'mask-image-y-to-color': [{ 'mask-y-to': $() }],
        'mask-image-radial': [{ 'mask-radial': [ue, se] }],
        'mask-image-radial-from-pos': [{ 'mask-radial-from': Y() }],
        'mask-image-radial-to-pos': [{ 'mask-radial-to': Y() }],
        'mask-image-radial-from-color': [{ 'mask-radial-from': $() }],
        'mask-image-radial-to-color': [{ 'mask-radial-to': $() }],
        'mask-image-radial-shape': [{ 'mask-radial': ['circle', 'ellipse'] }],
        'mask-image-radial-size': [
          {
            'mask-radial': [
              { closest: ['side', 'corner'], farthest: ['side', 'corner'] },
            ],
          },
        ],
        'mask-image-radial-pos': [{ 'mask-radial-at': I() }],
        'mask-image-conic-pos': [{ 'mask-conic': [Se] }],
        'mask-image-conic-from-pos': [{ 'mask-conic-from': Y() }],
        'mask-image-conic-to-pos': [{ 'mask-conic-to': Y() }],
        'mask-image-conic-from-color': [{ 'mask-conic-from': $() }],
        'mask-image-conic-to-color': [{ 'mask-conic-to': $() }],
        'mask-mode': [{ mask: ['alpha', 'luminance', 'match'] }],
        'mask-origin': [
          {
            'mask-origin': [
              'border',
              'padding',
              'content',
              'fill',
              'stroke',
              'view',
            ],
          },
        ],
        'mask-position': [{ mask: w() }],
        'mask-repeat': [{ mask: g() }],
        'mask-size': [{ mask: A() }],
        'mask-type': [{ 'mask-type': ['alpha', 'luminance'] }],
        'mask-image': [{ mask: ['none', ue, se] }],
        filter: [{ filter: ['', 'none', ue, se] }],
        blur: [{ blur: ee() }],
        brightness: [{ brightness: [Se, ue, se] }],
        contrast: [{ contrast: [Se, ue, se] }],
        'drop-shadow': [{ 'drop-shadow': ['', 'none', V, Ys, Ls] }],
        'drop-shadow-color': [{ 'drop-shadow': $() }],
        grayscale: [{ grayscale: ['', Se, ue, se] }],
        'hue-rotate': [{ 'hue-rotate': [Se, ue, se] }],
        invert: [{ invert: ['', Se, ue, se] }],
        saturate: [{ saturate: [Se, ue, se] }],
        sepia: [{ sepia: ['', Se, ue, se] }],
        'backdrop-filter': [{ 'backdrop-filter': ['', 'none', ue, se] }],
        'backdrop-blur': [{ 'backdrop-blur': ee() }],
        'backdrop-brightness': [{ 'backdrop-brightness': [Se, ue, se] }],
        'backdrop-contrast': [{ 'backdrop-contrast': [Se, ue, se] }],
        'backdrop-grayscale': [{ 'backdrop-grayscale': ['', Se, ue, se] }],
        'backdrop-hue-rotate': [{ 'backdrop-hue-rotate': [Se, ue, se] }],
        'backdrop-invert': [{ 'backdrop-invert': ['', Se, ue, se] }],
        'backdrop-opacity': [{ 'backdrop-opacity': [Se, ue, se] }],
        'backdrop-saturate': [{ 'backdrop-saturate': [Se, ue, se] }],
        'backdrop-sepia': [{ 'backdrop-sepia': ['', Se, ue, se] }],
        'border-collapse': [{ border: ['collapse', 'separate'] }],
        'border-spacing': [{ 'border-spacing': Z() }],
        'border-spacing-x': [{ 'border-spacing-x': Z() }],
        'border-spacing-y': [{ 'border-spacing-y': Z() }],
        'table-layout': [{ table: ['auto', 'fixed'] }],
        caption: [{ caption: ['top', 'bottom'] }],
        transition: [
          {
            transition: [
              '',
              'all',
              'colors',
              'opacity',
              'shadow',
              'transform',
              'none',
              ue,
              se,
            ],
          },
        ],
        'transition-behavior': [{ transition: ['normal', 'discrete'] }],
        duration: [{ duration: [Se, 'initial', ue, se] }],
        ease: [{ ease: ['linear', 'initial', k, ue, se] }],
        delay: [{ delay: [Se, ue, se] }],
        animate: [{ animate: ['none', te, ue, se] }],
        backface: [{ backface: ['hidden', 'visible'] }],
        perspective: [{ perspective: [B, ue, se] }],
        'perspective-origin': [{ 'perspective-origin': ne() }],
        rotate: [{ rotate: xe() }],
        'rotate-x': [{ 'rotate-x': xe() }],
        'rotate-y': [{ 'rotate-y': xe() }],
        'rotate-z': [{ 'rotate-z': xe() }],
        scale: [{ scale: Ke() }],
        'scale-x': [{ 'scale-x': Ke() }],
        'scale-y': [{ 'scale-y': Ke() }],
        'scale-z': [{ 'scale-z': Ke() }],
        'scale-3d': ['scale-3d'],
        skew: [{ skew: pe() }],
        'skew-x': [{ 'skew-x': pe() }],
        'skew-y': [{ 'skew-y': pe() }],
        transform: [{ transform: [ue, se, '', 'none', 'gpu', 'cpu'] }],
        'transform-origin': [{ origin: ne() }],
        'transform-style': [{ transform: ['3d', 'flat'] }],
        translate: [{ translate: he() }],
        'translate-x': [{ 'translate-x': he() }],
        'translate-y': [{ 'translate-y': he() }],
        'translate-z': [{ 'translate-z': he() }],
        'translate-none': ['translate-none'],
        accent: [{ accent: $() }],
        appearance: [{ appearance: ['none', 'auto'] }],
        'caret-color': [{ caret: $() }],
        'color-scheme': [
          {
            scheme: [
              'normal',
              'dark',
              'light',
              'light-dark',
              'only-dark',
              'only-light',
            ],
          },
        ],
        cursor: [
          {
            cursor: [
              'auto',
              'default',
              'pointer',
              'wait',
              'text',
              'move',
              'help',
              'not-allowed',
              'none',
              'context-menu',
              'progress',
              'cell',
              'crosshair',
              'vertical-text',
              'alias',
              'copy',
              'no-drop',
              'grab',
              'grabbing',
              'all-scroll',
              'col-resize',
              'row-resize',
              'n-resize',
              'e-resize',
              's-resize',
              'w-resize',
              'ne-resize',
              'nw-resize',
              'se-resize',
              'sw-resize',
              'ew-resize',
              'ns-resize',
              'nesw-resize',
              'nwse-resize',
              'zoom-in',
              'zoom-out',
              ue,
              se,
            ],
          },
        ],
        'field-sizing': [{ 'field-sizing': ['fixed', 'content'] }],
        'pointer-events': [{ 'pointer-events': ['auto', 'none'] }],
        resize: [{ resize: ['none', '', 'y', 'x'] }],
        'scroll-behavior': [{ scroll: ['auto', 'smooth'] }],
        'scroll-m': [{ 'scroll-m': Z() }],
        'scroll-mx': [{ 'scroll-mx': Z() }],
        'scroll-my': [{ 'scroll-my': Z() }],
        'scroll-ms': [{ 'scroll-ms': Z() }],
        'scroll-me': [{ 'scroll-me': Z() }],
        'scroll-mbs': [{ 'scroll-mbs': Z() }],
        'scroll-mbe': [{ 'scroll-mbe': Z() }],
        'scroll-mt': [{ 'scroll-mt': Z() }],
        'scroll-mr': [{ 'scroll-mr': Z() }],
        'scroll-mb': [{ 'scroll-mb': Z() }],
        'scroll-ml': [{ 'scroll-ml': Z() }],
        'scroll-p': [{ 'scroll-p': Z() }],
        'scroll-px': [{ 'scroll-px': Z() }],
        'scroll-py': [{ 'scroll-py': Z() }],
        'scroll-ps': [{ 'scroll-ps': Z() }],
        'scroll-pe': [{ 'scroll-pe': Z() }],
        'scroll-pbs': [{ 'scroll-pbs': Z() }],
        'scroll-pbe': [{ 'scroll-pbe': Z() }],
        'scroll-pt': [{ 'scroll-pt': Z() }],
        'scroll-pr': [{ 'scroll-pr': Z() }],
        'scroll-pb': [{ 'scroll-pb': Z() }],
        'scroll-pl': [{ 'scroll-pl': Z() }],
        'snap-align': [{ snap: ['start', 'end', 'center', 'align-none'] }],
        'snap-stop': [{ snap: ['normal', 'always'] }],
        'snap-type': [{ snap: ['none', 'x', 'y', 'both'] }],
        'snap-strictness': [{ snap: ['mandatory', 'proximity'] }],
        touch: [{ touch: ['auto', 'none', 'manipulation'] }],
        'touch-x': [{ 'touch-pan': ['x', 'left', 'right'] }],
        'touch-y': [{ 'touch-pan': ['y', 'up', 'down'] }],
        'touch-pz': ['touch-pinch-zoom'],
        select: [{ select: ['none', 'text', 'all', 'auto'] }],
        'will-change': [
          {
            'will-change': ['auto', 'scroll', 'contents', 'transform', ue, se],
          },
        ],
        fill: [{ fill: ['none', ...$()] }],
        'stroke-w': [{ stroke: [Se, pi, jn, wm] }],
        stroke: [{ stroke: ['none', ...$()] }],
        'forced-color-adjust': [{ 'forced-color-adjust': ['auto', 'none'] }],
      },
      conflictingClassGroups: {
        overflow: ['overflow-x', 'overflow-y'],
        overscroll: ['overscroll-x', 'overscroll-y'],
        inset: [
          'inset-x',
          'inset-y',
          'inset-bs',
          'inset-be',
          'start',
          'end',
          'top',
          'right',
          'bottom',
          'left',
        ],
        'inset-x': ['right', 'left'],
        'inset-y': ['top', 'bottom'],
        flex: ['basis', 'grow', 'shrink'],
        gap: ['gap-x', 'gap-y'],
        p: ['px', 'py', 'ps', 'pe', 'pbs', 'pbe', 'pt', 'pr', 'pb', 'pl'],
        px: ['pr', 'pl'],
        py: ['pt', 'pb'],
        m: ['mx', 'my', 'ms', 'me', 'mbs', 'mbe', 'mt', 'mr', 'mb', 'ml'],
        mx: ['mr', 'ml'],
        my: ['mt', 'mb'],
        size: ['w', 'h'],
        'font-size': ['leading'],
        'fvn-normal': [
          'fvn-ordinal',
          'fvn-slashed-zero',
          'fvn-figure',
          'fvn-spacing',
          'fvn-fraction',
        ],
        'fvn-ordinal': ['fvn-normal'],
        'fvn-slashed-zero': ['fvn-normal'],
        'fvn-figure': ['fvn-normal'],
        'fvn-spacing': ['fvn-normal'],
        'fvn-fraction': ['fvn-normal'],
        'line-clamp': ['display', 'overflow'],
        rounded: [
          'rounded-s',
          'rounded-e',
          'rounded-t',
          'rounded-r',
          'rounded-b',
          'rounded-l',
          'rounded-ss',
          'rounded-se',
          'rounded-ee',
          'rounded-es',
          'rounded-tl',
          'rounded-tr',
          'rounded-br',
          'rounded-bl',
        ],
        'rounded-s': ['rounded-ss', 'rounded-es'],
        'rounded-e': ['rounded-se', 'rounded-ee'],
        'rounded-t': ['rounded-tl', 'rounded-tr'],
        'rounded-r': ['rounded-tr', 'rounded-br'],
        'rounded-b': ['rounded-br', 'rounded-bl'],
        'rounded-l': ['rounded-tl', 'rounded-bl'],
        'border-spacing': ['border-spacing-x', 'border-spacing-y'],
        'border-w': [
          'border-w-x',
          'border-w-y',
          'border-w-s',
          'border-w-e',
          'border-w-bs',
          'border-w-be',
          'border-w-t',
          'border-w-r',
          'border-w-b',
          'border-w-l',
        ],
        'border-w-x': ['border-w-r', 'border-w-l'],
        'border-w-y': ['border-w-t', 'border-w-b'],
        'border-color': [
          'border-color-x',
          'border-color-y',
          'border-color-s',
          'border-color-e',
          'border-color-bs',
          'border-color-be',
          'border-color-t',
          'border-color-r',
          'border-color-b',
          'border-color-l',
        ],
        'border-color-x': ['border-color-r', 'border-color-l'],
        'border-color-y': ['border-color-t', 'border-color-b'],
        translate: ['translate-x', 'translate-y', 'translate-none'],
        'translate-none': [
          'translate',
          'translate-x',
          'translate-y',
          'translate-z',
        ],
        'scroll-m': [
          'scroll-mx',
          'scroll-my',
          'scroll-ms',
          'scroll-me',
          'scroll-mbs',
          'scroll-mbe',
          'scroll-mt',
          'scroll-mr',
          'scroll-mb',
          'scroll-ml',
        ],
        'scroll-mx': ['scroll-mr', 'scroll-ml'],
        'scroll-my': ['scroll-mt', 'scroll-mb'],
        'scroll-p': [
          'scroll-px',
          'scroll-py',
          'scroll-ps',
          'scroll-pe',
          'scroll-pbs',
          'scroll-pbe',
          'scroll-pt',
          'scroll-pr',
          'scroll-pb',
          'scroll-pl',
        ],
        'scroll-px': ['scroll-pr', 'scroll-pl'],
        'scroll-py': ['scroll-pt', 'scroll-pb'],
        touch: ['touch-x', 'touch-y', 'touch-pz'],
        'touch-x': ['touch'],
        'touch-y': ['touch'],
        'touch-pz': ['touch'],
      },
      conflictingClassGroupModifiers: { 'font-size': ['leading'] },
      orderSensitiveModifiers: [
        '*',
        '**',
        'after',
        'backdrop',
        'before',
        'details-content',
        'file',
        'first-letter',
        'first-line',
        'marker',
        'placeholder',
        'selection',
      ],
    };
  },
  rx = qv(sx);
function Dt(...l) {
  return rx(bv(l));
}
function ux({ className: l, ...r }) {
  return h.jsx('div', {
    role: 'alert',
    className: Dt(
      'rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700',
      l,
    ),
    ...r,
  });
}
function cx({ className: l, ...r }) {
  return h.jsx('h3', { className: Dt('font-medium text-slate-950', l), ...r });
}
function ox({ className: l, ...r }) {
  return h.jsx('div', {
    className: Dt('mt-1 text-sm text-slate-600', l),
    ...r,
  });
}
function Rm({ className: l, ...r }) {
  return h.jsx('span', {
    className: Dt(
      'inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700',
      l,
    ),
    ...r,
  });
}
const fx = 'https://auth.zccz14.com';
function dx(l) {
  const r = l.indexOf('?');
  if (r < 0) return { isPresent: !1, value: '' };
  const u = new URLSearchParams(l.slice(r + 1));
  return u.has('auth-origin')
    ? { isPresent: !0, value: u.get('auth-origin') ?? '' }
    : { isPresent: !1, value: '' };
}
function hx(l) {
  const r = l.trim();
  if (!r)
    return {
      authOrigin: '',
      configError:
        'auth-origin must be configured before interactive flows are enabled.',
      status: 'waiting',
    };
  let u;
  try {
    u = new URL(r);
  } catch {
    return {
      authOrigin: '',
      configError: 'auth-origin must be a valid http or https origin.',
      status: 'waiting',
    };
  }
  return ['http:', 'https:'].includes(u.protocol)
    ? u.pathname === '/' && !u.search && !u.hash
      ? { authOrigin: u.origin, configError: '', status: 'ready' }
      : {
          authOrigin: '',
          configError:
            'auth-origin must be an origin without a path, search, or hash.',
          status: 'waiting',
        }
    : {
        authOrigin: '',
        configError: 'auth-origin must be a valid http or https origin.',
        status: 'waiting',
      };
}
function mx({ hash: l, search: r, storageOrigin: u, pageOrigin: c }) {
  const f = dx(l),
    d = f.isPresent ? f.value : u || fx,
    m = hx(d);
  return {
    authOrigin: m.authOrigin,
    configError: m.configError,
    pageOrigin: c,
    status: m.status,
  };
}
function yx() {
  function l() {
    const S = new Error('request_failed: Invalid /me payload');
    return (
      (S.name = 'AuthMiniSdkError'),
      (S.code = 'request_failed'),
      (S.error = 'request_failed'),
      S
    );
  }
  function r(S) {
    return typeof S == 'object' && S !== null ? S : null;
  }
  function u(S) {
    if (typeof S != 'string') throw l();
    return S;
  }
  function c(S) {
    return S === null ? null : u(S);
  }
  function f(S) {
    return d(S).map((b) => u(b));
  }
  function d(S) {
    if (!Array.isArray(S)) throw l();
    return S;
  }
  function m(S) {
    const b = r(S);
    if (!b) throw l();
    return {
      id: u(b.id),
      credential_id: u(b.credential_id),
      transports: f(b.transports),
      rp_id: u(b.rp_id),
      last_used_at: c(b.last_used_at),
      created_at: u(b.created_at),
    };
  }
  function x(S) {
    const b = r(S);
    if (!b) throw l();
    return {
      id: u(b.id),
      name: u(b.name),
      public_key: u(b.public_key),
      last_used_at: c(b.last_used_at),
      created_at: u(b.created_at),
    };
  }
  function p(S) {
    const b = r(S);
    if (!b) throw l();
    return {
      id: u(b.id),
      auth_method: u(b.auth_method),
      created_at: u(b.created_at),
      expires_at: u(b.expires_at),
      ip: c(b.ip),
      user_agent: c(b.user_agent),
    };
  }
  function v(S) {
    const b = r(S);
    if (!b) throw l();
    return {
      user_id: u(b.user_id),
      email: c(b.email),
      webauthn_credentials: d(b.webauthn_credentials).map(m),
      ed25519_credentials: d(b.ed25519_credentials).map(x),
      active_sessions: d(b.active_sessions).map(p),
    };
  }
  return { parseMeResponse: v };
}
const { parseMeResponse: px } = yx();
let zm = null;
function gx(l, r = {}) {
  return bx().createBrowserSdkInternal({ ...r, baseUrl: l });
}
function bx() {
  return (zm ?? (zm = vx()), zm);
}
function vx(l = px) {
  const r = 'auth-mini.sdk';
  function u(g, A) {
    const N = new Error(`${g}: ${A}`);
    return ((N.name = 'AuthMiniSdkError'), (N.code = g), N);
  }
  function c(g, A) {
    const N = u(
      'request_failed',
      typeof (A == null ? void 0 : A.error) == 'string'
        ? A.error
        : `Request failed with status ${g}`,
    );
    return (
      (N.status = g),
      A && typeof A == 'object' && Object.assign(N, A),
      'error' in N || (N.error = 'request_failed'),
      N
    );
  }
  function f(g) {
    if (g.storage) return g.storage;
    let A;
    try {
      A = g.getDefaultStorage();
    } catch {
      throw u('sdk_init_failed', 'localStorage is unavailable');
    }
    if (!A) throw u('sdk_init_failed', 'localStorage is unavailable');
    return A;
  }
  function d(g) {
    var N;
    const A =
      g ?? ((N = globalThis.fetch) == null ? void 0 : N.bind(globalThis));
    if (!A) throw u('sdk_init_failed', 'fetch is unavailable');
    return A;
  }
  function m(g) {
    return `${r}:${x(g).toString()}`;
  }
  function x(g) {
    const A = new URL(g);
    return (
      (A.search = ''),
      (A.hash = ''),
      (A.pathname = A.pathname.endsWith('/') ? A.pathname : `${A.pathname}/`),
      A
    );
  }
  function p(g, A) {
    const N = g.getItem(A);
    if (!N) return null;
    try {
      const Q = JSON.parse(N);
      if (!Q || typeof Q != 'object') return null;
      const K = Q,
        P = W(K.sessionId),
        fe = W(K.accessToken),
        Y = W(K.refreshToken),
        ee = W(K.receivedAt),
        xe = W(K.expiresAt);
      return P === void 0 ||
        fe === void 0 ||
        Y === void 0 ||
        ee === void 0 ||
        xe === void 0 ||
        (Y && !P)
        ? null
        : {
            sessionId: P,
            accessToken: fe,
            refreshToken: Y,
            receivedAt: ee,
            expiresAt: xe,
          };
    } catch {
      return null;
    }
  }
  function v(g, A, N) {
    g.setItem(A, JSON.stringify(N));
  }
  function S(g, A) {
    g.removeItem(A);
  }
  function b(g, A) {
    const N = new Set();
    let Q = K();
    return {
      getState() {
        return w(Q);
      },
      onChange(ee) {
        return (N.add(ee), () => N.delete(ee));
      },
      setRecovering(ee) {
        fe({ status: 'recovering', authenticated: !1, ...ce(ee) });
      },
      setAuthenticated(ee) {
        fe({ status: 'authenticated', authenticated: !0, ...ce(ee) });
      },
      setAnonymous() {
        (S(g, A), Y(le('anonymous')));
      },
      applyPersistedState(ee) {
        Y(P(ee));
      },
      setAnonymousLocal() {
        Y(le('anonymous'));
      },
    };
    function K() {
      return P(p(g, A));
    }
    function P(ee) {
      return !(ee != null && ee.refreshToken) || !ee.sessionId
        ? le('anonymous')
        : $({ status: 'recovering', authenticated: !1, ...ee });
    }
    function fe(ee) {
      const xe = ce(ee);
      (v(g, A, xe),
        Y({ status: ee.status, authenticated: ee.authenticated, ...xe }));
    }
    function Y(ee) {
      Q = $(ee);
      for (const xe of N) xe(w(Q));
    }
  }
  function _(g) {
    return {
      getJson(K, P = {}) {
        return A('GET', K, P);
      },
      postJson(K, P, fe = {}) {
        return A('POST', K, { ...fe, body: P });
      },
    };
    async function A(K, P, fe) {
      const Y = await g.fetch(new URL(P.replace(/^\//, ''), g.baseUrl), {
          method: K,
          headers: N(fe),
          ...(fe.body === void 0 ? {} : { body: JSON.stringify(fe.body) }),
        }),
        ee = await Q(Y);
      if (!Y.ok) throw c(Y.status, ee);
      return ee;
    }
    function N(K) {
      const P = { accept: 'application/json' };
      return (
        K.body !== void 0 && (P['content-type'] = 'application/json'),
        K.accessToken && (P.authorization = `Bearer ${K.accessToken}`),
        P
      );
    }
    async function Q(K) {
      const P = await K.text();
      if (!P) return null;
      try {
        return JSON.parse(P);
      } catch {
        return null;
      }
    }
  }
  function V(g, A, N) {
    const Q = A - N,
      K = Q < 10 * 6e4 ? Q / 2 : 5 * 6e4;
    return g >= A - K;
  }
  function G(g, A) {
    if (!g.expiresAt || !g.receivedAt) return !0;
    const N = Date.parse(g.expiresAt),
      Q = Date.parse(g.receivedAt);
    return !Number.isFinite(N) || !Number.isFinite(Q) ? !0 : V(A, N, Q);
  }
  function B(g, A) {
    const N = g;
    if (
      !N ||
      typeof N != 'object' ||
      typeof N.access_token != 'string' ||
      typeof N.session_id != 'string' ||
      typeof N.refresh_token != 'string' ||
      typeof N.expires_in != 'number'
    )
      throw u('request_failed', 'Invalid session payload');
    const Q = A();
    return {
      sessionId: N.session_id,
      accessToken: N.access_token,
      refreshToken: N.refresh_token,
      receivedAt: new Date(Q).toISOString(),
      expiresAt: new Date(Q + N.expires_in * 1e3).toISOString(),
    };
  }
  function D(g) {
    let A = null,
      N = null;
    const Q = {
      getState() {
        return g.state.getState();
      },
      onChange(Y) {
        return g.state.onChange(Y);
      },
      async acceptSessionResponse(Y, ee = {}) {
        const xe = B(Y, g.now);
        g.state.setRecovering(xe);
        try {
          return (g.state.setAuthenticated(xe), xe);
        } catch (Ke) {
          throw (
            (ee.clearOnMeFailure !== 'auth-invalidating' || Re(Ke)) &&
              g.state.setAnonymous(),
            Ke
          );
        }
      },
      async refresh() {
        if (A) return A;
        const Y = g.state.getState();
        if (!Y.refreshToken)
          throw u('missing_session', 'Missing refresh token');
        if (!Y.sessionId) throw u('missing_session', 'Missing session id');
        return (
          (A = (async () => {
            try {
              const ee = await g.http.postJson('/session/refresh', {
                session_id: Y.sessionId,
                refresh_token: Y.refreshToken,
              });
              return await Q.acceptSessionResponse(ee, {
                clearOnMeFailure: 'auth-invalidating',
              });
            } catch (ee) {
              if (De(ee)) {
                const xe = P(Y);
                N = xe.finally(() => {
                  N === xe && (N = null);
                });
              } else (Re(ee) || Ee(ee)) && g.state.setAnonymous();
              throw ee;
            } finally {
              A = null;
            }
          })()),
          A
        );
      },
      async recover() {
        const Y = g.state.getState();
        if (!Y.refreshToken) {
          g.state.setAnonymous();
          return;
        }
        try {
          if (!Y.accessToken || G(Y, g.now())) {
            await Q.refresh();
            return;
          }
          g.state.setAuthenticated({
            sessionId: Y.sessionId,
            accessToken: Y.accessToken,
            refreshToken: Y.refreshToken,
            receivedAt: Y.receivedAt ?? new Date(g.now()).toISOString(),
            expiresAt: Y.expiresAt ?? new Date(g.now()).toISOString(),
          });
        } catch (ee) {
          if (De(ee)) {
            await N;
            const xe = g.state.getState();
            ae(xe, Y) && g.state.setAnonymousLocal();
            return;
          }
          if ((Re(ee) || Ee(ee)) && (g.state.setAnonymous(), Ee(ee))) throw ee;
        }
      },
      async fetchMe() {
        const Y = g.state.getState();
        if (!Y.refreshToken)
          throw u('missing_session', 'Missing refresh token');
        if (!Y.accessToken || G(Y, g.now()))
          return await K((await Q.refresh()).accessToken);
        if (!Y.sessionId) throw u('missing_session', 'Missing session id');
        return await K(Y.accessToken);
      },
      async logout() {
        const Y = g.state.getState();
        if (!Y.refreshToken && !Y.accessToken) {
          g.state.setAnonymous();
          return;
        }
        try {
          let ee = Y.accessToken;
          if (Y.refreshToken && (!ee || G(Y, g.now())))
            try {
              ee = (await Q.refresh()).accessToken;
            } catch {
              ee = null;
            }
          ee &&
            (await g.http.postJson('/session/logout', void 0, {
              accessToken: ee,
            }));
        } catch {
        } finally {
          g.state.setAnonymous();
        }
      },
    };
    return Q;
    async function K(Y) {
      if (!Y) throw u('missing_session', 'Missing access token');
      return l(await g.http.getJson('/me', { accessToken: Y }));
    }
    async function P(Y) {
      var Ke;
      g.state.setRecovering({
        sessionId: Y.sessionId,
        accessToken: Y.accessToken,
        refreshToken: Y.refreshToken ?? '',
        receivedAt: Y.receivedAt ?? new Date(g.now()).toISOString(),
        expiresAt: Y.expiresAt ?? new Date(g.now()).toISOString(),
      });
      const ee = g.recoveryTimeoutMs ?? 50,
        xe = Date.now() + ee;
      for (;;) {
        const pe = g.state.getState();
        if (!ae(pe, Y) || fe(Y) === 'usable') return;
        const Le = xe - Date.now();
        if (Le <= 0) break;
        await ((Ke = g.waitForExternalStorage) == null
          ? void 0
          : Ke.call(g, Le));
      }
      g.state.setAnonymousLocal();
    }
    function fe(Y) {
      var xe;
      const ee = (xe = g.readSharedState) == null ? void 0 : xe.call(g);
      return !(ee != null && ee.sessionId) || !ee.refreshToken || !Be(Y, ee)
        ? 'none'
        : ee.accessToken && !G(ee, g.now())
          ? (g.state.setAuthenticated({
              sessionId: ee.sessionId,
              accessToken: ee.accessToken,
              refreshToken: ee.refreshToken,
              receivedAt: ee.receivedAt ?? new Date(g.now()).toISOString(),
              expiresAt: ee.expiresAt ?? new Date(g.now()).toISOString(),
            }),
            'usable')
          : (g.state.applyPersistedState(ee), 'provisional');
    }
  }
  function k(g) {
    return {
      start(A) {
        return g.http.postJson('/email/start', A);
      },
      async verify(A) {
        const N = await g.http.postJson('/email/verify', A);
        return await g.session.acceptSessionResponse(N);
      },
    };
  }
  function te(g) {
    return {
      async authenticate(P = {}) {
        var xe;
        A('authenticate');
        const fe = await g.http.postJson(
            '/webauthn/authenticate/options',
            K(P),
          ),
          Y = await N(
            'authenticate',
            (xe = g.navigatorCredentials) == null ? void 0 : xe.get,
            { publicKey: Z(fe.publicKey) },
          ),
          ee = await g.http.postJson('/webauthn/authenticate/verify', {
            request_id: fe.request_id,
            credential: ye(Y),
          });
        return await g.session.acceptSessionResponse(ee);
      },
      async register(P = {}) {
        var Ke;
        A('register');
        const fe = await Q(),
          Y = await g.http.postJson('/webauthn/register/options', K(P), {
            accessToken: fe,
          }),
          ee = await N(
            'register',
            (Ke = g.navigatorCredentials) == null ? void 0 : Ke.create,
            { publicKey: J(Y.publicKey) },
          ),
          xe = await Q();
        return await g.http.postJson(
          '/webauthn/register/verify',
          { request_id: Y.request_id, credential: ye(ee) },
          { accessToken: xe },
        );
      },
    };
    function A(P) {
      var Y, ee;
      const fe =
        P === 'register'
          ? typeof ((Y = g.navigatorCredentials) == null ? void 0 : Y.create) ==
            'function'
          : typeof ((ee = g.navigatorCredentials) == null ? void 0 : ee.get) ==
            'function';
      if (!g.publicKeyCredential || !fe)
        throw u(
          'webauthn_unsupported',
          'WebAuthn is unavailable in this browser',
        );
    }
    async function N(P, fe, Y) {
      if (!fe)
        throw u(
          'webauthn_unsupported',
          'WebAuthn is unavailable in this browser',
        );
      try {
        const ee = await fe(Y);
        if (!ee)
          throw u(
            'webauthn_cancelled',
            P === 'register'
              ? 'Passkey registration cancelled'
              : 'Passkey authentication cancelled',
          );
        return ee;
      } catch (ee) {
        throw Ye(ee)
          ? u(
              'webauthn_cancelled',
              P === 'register'
                ? 'Passkey registration cancelled'
                : 'Passkey authentication cancelled',
            )
          : ee;
      }
    }
    async function Q() {
      const P = g.state.getState();
      if (!P.refreshToken && !P.accessToken)
        throw u('missing_session', 'Missing authenticated session');
      return !P.accessToken || G(P, g.now())
        ? (await g.session.refresh()).accessToken
        : P.accessToken;
    }
    function K(P) {
      var Y;
      return {
        rp_id:
          typeof (P == null ? void 0 : P.rpId) == 'string' && P.rpId.length > 0
            ? P.rpId
            : (Y = globalThis.location) == null
              ? void 0
              : Y.hostname,
      };
    }
  }
  function F(g) {
    var pe;
    const A = g.storageKey ?? r,
      N = b(g.storage, A),
      Q = new Set(),
      K = _({ baseUrl: g.baseUrl, fetch: g.fetch }),
      P = (he) => {
        he != null &&
        he.sessionId &&
        he.refreshToken &&
        he.accessToken &&
        !G(he, (g.now ?? (() => Date.now()))())
          ? N.setAuthenticated({
              sessionId: he.sessionId,
              accessToken: he.accessToken,
              refreshToken: he.refreshToken,
              receivedAt:
                he.receivedAt ??
                new Date((g.now ?? (() => Date.now()))()).toISOString(),
              expiresAt:
                he.expiresAt ??
                new Date((g.now ?? (() => Date.now()))()).toISOString(),
            })
          : N.applyPersistedState(he);
        for (const Le of Q) Le();
      };
    (pe = g.storageSync) == null || pe.subscribe(P);
    const fe = D({
        http: K,
        now: g.now ?? (() => Date.now()),
        readSharedState: () => {
          var he, Le;
          return (
            ((Le = (he = g.storageSync) == null ? void 0 : he.getSnapshot) ==
            null
              ? void 0
              : Le.call(he)) ?? p(g.storage, A)
          );
        },
        recoveryTimeoutMs: g.recoveryTimeoutMs,
        state: N,
        waitForExternalStorage(he) {
          return new Promise((Le) => {
            let ia = !1;
            const sn = () => {
                ia || ((ia = !0), clearTimeout(rn), Q.delete(sn), Le());
              },
              rn = setTimeout(sn, he);
            Q.add(sn);
          });
        },
      }),
      Y = g.now ?? (() => Date.now()),
      ee = te({
        http: K,
        navigatorCredentials: g.navigatorCredentials,
        now: Y,
        publicKeyCredential: g.publicKeyCredential,
        session: fe,
        state: N,
      }),
      xe = {
        email: k({ http: K, session: fe }),
        me: {
          fetch() {
            return fe.fetchMe();
          },
        },
        session: {
          getState() {
            return N.getState();
          },
          onChange(he) {
            return N.onChange(he);
          },
          refresh() {
            return fe.refresh();
          },
          logout() {
            return fe.logout();
          },
        },
        passkey: ee,
        webauthn: ee,
      },
      Ke =
        g.autoRecover !== !1 && N.getState().status === 'recovering'
          ? Promise.resolve().then(() => fe.recover())
          : Promise.resolve();
    return (Ke.catch(() => {}), Object.assign(xe, { ready: Ke }));
  }
  function I(g) {
    var fe;
    const A = typeof window > 'u' ? globalThis : window,
      N = g.baseUrl;
    if (!N) throw u('sdk_init_failed', 'Cannot determine SDK base URL');
    const Q = x(N).toString(),
      K = m(Q),
      P = f({ storage: g.storage, getDefaultStorage: () => A.localStorage });
    return F({
      baseUrl: Q,
      fetch: d(g.fetch),
      navigatorCredentials:
        (fe = A.navigator) == null ? void 0 : fe.credentials,
      now: g.now,
      publicKeyCredential: A.PublicKeyCredential,
      recoveryTimeoutMs: g.recoveryTimeoutMs,
      storage: P,
      storageKey: K,
      storageSync: ne(A, P, K),
    });
  }
  function ne(g, A, N) {
    return typeof (g == null ? void 0 : g.addEventListener) != 'function'
      ? null
      : {
          getSnapshot() {
            return p(A, N);
          },
          subscribe(Q) {
            const K = (P) => {
              P.key !== N || P.storageArea !== A || Q(p(A, N));
            };
            return (
              g.addEventListener('storage', K),
              () => {
                g.removeEventListener('storage', K);
              }
            );
          },
        };
  }
  function W(g) {
    return g == null ? null : typeof g == 'string' ? g : void 0;
  }
  function J(g) {
    return {
      ...g,
      challenge: z(g.challenge),
      user: { ...g.user, id: z(g.user.id) },
      excludeCredentials: Array.isArray(g.excludeCredentials)
        ? g.excludeCredentials.map((A) => ({ ...A, id: z(A.id) }))
        : void 0,
    };
  }
  function Z(g) {
    return {
      ...g,
      challenge: z(g.challenge),
      allowCredentials: Array.isArray(g.allowCredentials)
        ? g.allowCredentials.map((A) => ({ ...A, id: z(A.id) }))
        : void 0,
    };
  }
  function ye(g) {
    const A = g.response,
      N = {
        id: g.id,
        rawId: q(g.rawId),
        type: g.type,
        response: { clientDataJSON: q(A.clientDataJSON) },
      };
    return (
      typeof g.getClientExtensionResults == 'function'
        ? (N.clientExtensionResults = g.getClientExtensionResults())
        : g.clientExtensionResults &&
          (N.clientExtensionResults = g.clientExtensionResults),
      typeof A.getTransports == 'function' &&
        (N.response.transports = A.getTransports()),
      'attestationObject' in A &&
        A.attestationObject &&
        (N.response.attestationObject = q(A.attestationObject)),
      'authenticatorData' in A &&
        A.authenticatorData &&
        (N.response.authenticatorData = q(A.authenticatorData)),
      'signature' in A &&
        A.signature &&
        (N.response.signature = q(A.signature)),
      'userHandle' in A &&
        A.userHandle &&
        (N.response.userHandle = q(A.userHandle)),
      N
    );
  }
  function Ye(g) {
    const A = g;
    return (
      (A == null ? void 0 : A.code) === 'webauthn_cancelled' ||
      (A == null ? void 0 : A.name) === 'AbortError' ||
      (A == null ? void 0 : A.name) === 'NotAllowedError'
    );
  }
  function Re(g) {
    const A = g;
    return (
      (A == null ? void 0 : A.error) === 'invalid_refresh_token' ||
      (A == null ? void 0 : A.error) === 'session_invalidated' ||
      ((A == null ? void 0 : A.status) === 401 &&
        (A == null ? void 0 : A.error) !== 'session_superseded')
    );
  }
  function Ee(g) {
    const A = g;
    return (
      (A == null ? void 0 : A.code) === 'request_failed' &&
      ((A == null ? void 0 : A.message) ===
        'request_failed: Invalid session payload' ||
        (A == null ? void 0 : A.message) ===
          'request_failed: Invalid /me payload')
    );
  }
  function De(g) {
    const A = g;
    return (A == null ? void 0 : A.error) === 'session_superseded';
  }
  function Be(g, A) {
    return (
      g.sessionId !== A.sessionId ||
      g.accessToken !== A.accessToken ||
      g.refreshToken !== A.refreshToken ||
      g.receivedAt !== A.receivedAt ||
      g.expiresAt !== A.expiresAt
    );
  }
  function ae(g, A) {
    return g.status === 'recovering' && g.sessionId === A.sessionId;
  }
  function z(g) {
    const A = g.replace(/-/g, '+').replace(/_/g, '/'),
      N = A.padEnd(Math.ceil(A.length / 4) * 4, '='),
      Q =
        typeof Buffer < 'u'
          ? Buffer.from(N, 'base64')
          : Uint8Array.from(globalThis.atob(N), (K) => K.charCodeAt(0));
    return new Uint8Array(Q);
  }
  function q(g) {
    const A =
      g instanceof Uint8Array
        ? g
        : g instanceof ArrayBuffer
          ? new Uint8Array(g)
          : new Uint8Array(g.buffer, g.byteOffset, g.byteLength);
    return (
      typeof Buffer < 'u'
        ? Buffer.from(A).toString('base64')
        : globalThis.btoa(String.fromCharCode(...A))
    )
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');
  }
  function le(g) {
    return $({
      status: g,
      authenticated: g === 'authenticated',
      sessionId: null,
      accessToken: null,
      refreshToken: null,
      receivedAt: null,
      expiresAt: null,
    });
  }
  function ce(g) {
    return {
      sessionId: g.sessionId,
      accessToken: g.accessToken,
      refreshToken: g.refreshToken,
      receivedAt: g.receivedAt,
      expiresAt: g.expiresAt,
    };
  }
  function $(g) {
    return Object.freeze(g);
  }
  function w(g) {
    return $({ status: g.status, authenticated: g.authenticated, ...ce(g) });
  }
  return { createAuthMiniInternal: F, createBrowserSdkInternal: I };
}
function xx(l) {
  return gx(l);
}
function Sx(l) {
  const r = new URL(l);
  return (
    (r.search = ''),
    (r.hash = ''),
    (r.pathname = r.pathname.endsWith('/') ? r.pathname : `${r.pathname}/`),
    `auth-mini.sdk:${r.toString()}`
  );
}
function Ex(l, r, u) {
  const c = new Date().toISOString(),
    f = new Date(Date.now() + u.expires_in * 1e3).toISOString();
  l.setItem(
    Sx(r),
    JSON.stringify({
      sessionId: u.session_id,
      accessToken: u.access_token,
      refreshToken: u.refresh_token,
      receivedAt: c,
      expiresAt: f,
    }),
  );
}
function _m(l) {
  const r = xx(l);
  function u(d) {
    return (
      typeof d == 'object' &&
      d !== null &&
      'status' in d &&
      d.status === 401 &&
      (!('error' in d) || d.error !== 'session_superseded')
    );
  }
  async function c(d = !1) {
    const m = r.session.getState();
    if (!m.refreshToken && !m.accessToken)
      throw new Error('Missing authenticated session');
    if (!d && m.accessToken) return m.accessToken;
    const x = await r.session.refresh();
    if (!x.accessToken) throw new Error('Missing authenticated session');
    return x.accessToken;
  }
  async function f(d, m, x) {
    const p = await fetch(new URL(d, l), {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          ...(x ? { authorization: `Bearer ${x}` } : {}),
        },
        body: JSON.stringify(m),
      }),
      v = await p.json();
    if (!p.ok)
      throw typeof v == 'object' && v !== null
        ? { status: p.status, ...v }
        : { status: p.status, error: 'request_failed' };
    return v;
  }
  return {
    ...r,
    ed25519: {
      async register(d) {
        const m = { name: d.name, public_key: d.public_key };
        try {
          return await f('/ed25519/credentials', m, await c());
        } catch (x) {
          if (!u(x) || !r.session.getState().refreshToken) throw x;
          return await f('/ed25519/credentials', m, await c(!0));
        }
      },
      start(d) {
        return f('/ed25519/start', d);
      },
      verify(d) {
        return f('/ed25519/verify', d);
      },
    },
  };
}
const eo = 'auth-mini-demo.auth-origin';
function Tx(l) {
  try {
    return (l == null ? void 0 : l.getItem(eo)) ?? '';
  } catch {
    return '';
  }
}
function Ax(l, r) {
  try {
    r == null || r.setItem(eo, l);
  } catch {}
}
function Om(l) {
  try {
    l == null || l.removeItem(eo);
  } catch {}
}
const _c = {
  status: 'anonymous',
  authenticated: !1,
  sessionId: null,
  accessToken: null,
  refreshToken: null,
  receivedAt: null,
  expiresAt: null,
};
function wx(l) {
  const r = l.indexOf('?');
  if (r < 0) return l;
  const u = l.slice(0, r),
    c = new URLSearchParams(l.slice(r + 1));
  c.delete('auth-origin');
  const f = c.toString();
  return f ? `${u}?${f}` : u;
}
const My = E.createContext(null);
function jx({ children: l, initialLocation: r }) {
  const u = r ?? {
      hash: window.location.hash,
      search: window.location.search,
      origin: window.location.origin,
    },
    [c, f] = E.useState(null),
    [d, m] = E.useState(_c),
    [x, p] = E.useState(null),
    [v, S] = E.useState(null),
    b = E.useRef(null);
  let _;
  if (typeof window < 'u')
    try {
      _ = window.localStorage;
    } catch {
      _ = void 0;
    }
  const V = x === null ? Tx(_) : x,
    G = v ?? u.hash,
    B = mx({
      hash: G,
      search: u.search,
      storageOrigin: V,
      pageOrigin: u.origin,
    });
  function D(te) {
    var F;
    ((F = b.current) == null || F.call(b),
      f(te),
      m(te.session.getState()),
      (b.current = te.session.onChange((I) => {
        m(I);
      })));
  }
  (E.useEffect(() => {
    if (_) {
      if (B.status === 'ready') {
        Ax(B.authOrigin, _);
        return;
      }
      Om(_);
    }
  }, [B.authOrigin, B.status, _]),
    E.useEffect(() => {
      var F;
      if (B.status !== 'ready') {
        ((F = b.current) == null || F.call(b),
          (b.current = null),
          f(null),
          m(_c));
        return;
      }
      const te = _m(B.authOrigin);
      return (
        D(te),
        () => {
          var I;
          ((I = b.current) == null || I.call(b), (b.current = null));
        }
      );
    }, [B.authOrigin, B.status]));
  const k = E.useMemo(
    () => ({
      config: B,
      adoptDemoSession: async (te) => {
        if (!_ || B.status !== 'ready')
          throw new Error('Demo setup is not ready');
        Ex(_, B.authOrigin, te);
        const F = _m(B.authOrigin);
        D(F);
      },
      clearLocalAuthState: async () => {
        const te = wx(typeof window > 'u' ? G : window.location.hash);
        if (
          (typeof window < 'u' &&
            te !== window.location.hash &&
            window.history.replaceState(
              window.history.state,
              '',
              `${window.location.pathname}${window.location.search}${te}`,
            ),
          p(''),
          S(te),
          Om(_),
          !c)
        ) {
          m(_c);
          return;
        }
        (await c.session.logout(), m(c.session.getState()));
      },
      sdk: c,
      session: d,
      setAuthOrigin: (te) => {
        p(te.trim());
      },
    }),
    [B, c, d],
  );
  return h.jsx(My.Provider, { value: k, children: l });
}
function ln() {
  const l = E.useContext(My);
  if (!l) throw new Error('useDemo must be used inside DemoProvider');
  return l;
}
function Nx() {
  const { config: l, sdk: r } = ln();
  return h.jsxs(ux, {
    className:
      'flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between',
    children: [
      h.jsxs('div', {
        children: [
          h.jsx(cx, { children: 'Demo status' }),
          h.jsx(ox, {
            children: l.configError || `Connected to ${l.authOrigin}`,
          }),
        ],
      }),
      h.jsxs('div', {
        className: 'flex items-center gap-2',
        children: [
          h.jsx(Rm, { children: l.status }),
          h.jsx(Rm, {
            className: r
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-amber-100 text-amber-700',
            children: r ? 'sdk ready' : 'sdk idle',
          }),
        ],
      }),
    ],
  });
}
const Rx = [
  ['/', 'Home'],
  ['/setup', 'Setup'],
  ['/email', 'Email'],
  ['/ed25519', 'ED25519'],
  ['/passkey', 'Passkey'],
  ['/credentials', 'Credentials'],
  ['/session', 'Session'],
];
function zx() {
  return h.jsxs('div', {
    className: 'min-h-screen bg-slate-50 text-slate-950',
    children: [
      h.jsx('header', {
        className: 'border-b border-slate-200 bg-white/90 backdrop-blur',
        children: h.jsx('nav', {
          className:
            'mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-6 py-4',
          children: Rx.map(([l, r]) =>
            h.jsx(
              py,
              {
                to: l,
                className: ({ isActive: u }) =>
                  Dt(
                    'rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950',
                    u &&
                      'bg-slate-900 text-white hover:bg-slate-900 hover:text-white',
                  ),
                children: r,
              },
              l,
            ),
          ),
        }),
      }),
      h.jsxs('main', {
        className: 'mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10',
        children: [h.jsx(Nx, {}), h.jsx(H0, {})],
      }),
    ],
  });
}
function Zs({ className: l, ...r }) {
  return h.jsx('div', {
    className: Dt('rounded-xl border border-slate-200 bg-white shadow-sm', l),
    ...r,
  });
}
function Qs({ className: l, ...r }) {
  return h.jsx('div', { className: Dt('flex flex-col gap-1.5 p-6', l), ...r });
}
function Dy({ className: l, ...r }) {
  return h.jsx('h2', {
    className: Dt('text-lg font-semibold text-slate-950', l),
    ...r,
  });
}
function Vs({ className: l, ...r }) {
  return h.jsx('p', { className: Dt('text-sm text-slate-600', l), ...r });
}
function Bc({ className: l, ...r }) {
  return h.jsx('div', { className: Dt('p-6 pt-0', l), ...r });
}
function vl({ title: l, description: r, children: u }) {
  return h.jsxs(Zs, {
    children: [
      h.jsxs(Qs, {
        children: [h.jsx(Dy, { children: l }), h.jsx(Vs, { children: r })],
      }),
      h.jsx(Bc, { children: u }),
    ],
  });
}
const mt = E.forwardRef(({ className: l, type: r = 'button', ...u }, c) =>
  h.jsx('button', {
    ref: c,
    type: r,
    className: Dt(
      'inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50',
      l,
    ),
    ...u,
  }),
);
mt.displayName = 'Button';
function _x(l) {
  return typeof l == 'object' && l !== null ? l : null;
}
function Cm(l, r = 20) {
  return l.length <= r * 2 + 1 ? l : `${l.slice(0, r)}…${l.slice(-r)}`;
}
function Ox(l) {
  const r = l.replace(/-/g, '+').replace(/_/g, '/'),
    u = (4 - (r.length % 4)) % 4;
  return atob(`${r}${'='.repeat(u)}`);
}
function Cx(l) {
  const [, r] = l.split('.');
  if (!r) return null;
  try {
    return _x(JSON.parse(Ox(r)));
  } catch {
    return null;
  }
}
function Mx(l) {
  const r = Cx(l);
  if (!r) return 'not-manageable';
  if (!('amr' in r)) return 'legacy-token';
  const u = Array.isArray(r.amr)
    ? r.amr.filter((c) => typeof c == 'string')
    : [];
  return u.length === 0
    ? 'not-manageable'
    : u.includes('email_otp') || u.includes('webauthn')
      ? 'manageable'
      : 'not-manageable';
}
function Dx() {
  const { config: l, sdk: r, session: u } = ln(),
    [c, f] = E.useState(null),
    [d, m] = E.useState(!1),
    [x, p] = E.useState(''),
    [v, S] = E.useState(''),
    b = E.useRef(0),
    [_, V] = E.useState({ passkey: !1, ed25519: !1 }),
    G = E.useRef({ passkey: !1, ed25519: !1 }),
    [B, D] = E.useState(''),
    [k, te] = E.useState(''),
    [F, I] = E.useState(null);
  E.useEffect(() => {
    I(null);
  }, [u.accessToken]);
  const ne =
      l.status === 'ready' &&
      !!r &&
      u.authenticated &&
      typeof u.accessToken == 'string' &&
      u.accessToken.length > 0,
    W = typeof u.accessToken == 'string' ? u.accessToken : '',
    J = F ?? W,
    Z = ne ? Mx(J) : 'not-manageable',
    ye = Z === 'manageable',
    Ye = E.useCallback(
      async (ae) => {
        const z = b.current + 1;
        if (((b.current = z), !ne || !r || l.status !== 'ready')) {
          (f(null), p(''), S(''), m(!1));
          return;
        }
        (m(!0), p(''), (ae != null && ae.warningMessage) || S(''));
        try {
          const q = await r.me.fetch();
          if (b.current !== z) return;
          (f(q), S(''));
        } catch (q) {
          if (b.current !== z) return;
          if (ae != null && ae.warningMessage) {
            S(ae.warningMessage);
            return;
          }
          (f(null),
            p(
              q instanceof Error
                ? q.message
                : 'Unable to load current account.',
            ));
        } finally {
          b.current === z && m(!1);
        }
      },
      [ne, l.status, r, u.sessionId],
    );
  (E.useEffect(() => {
    Ye();
  }, [Ye]),
    E.useEffect(() => {
      if (!ne || !r || Z !== 'legacy-token' || !u.refreshToken || F) return;
      let ae = !1;
      return (
        r.session
          .refresh()
          .then((z) => {
            !ae && typeof z.accessToken == 'string' && I(z.accessToken);
          })
          .catch(() => {}),
        () => {
          ae = !0;
        }
      );
    }, [F, ne, Z, r, u.refreshToken]));
  const Re = (c == null ? void 0 : c.email) ?? '',
    Ee = (c == null ? void 0 : c.webauthn_credentials) ?? [],
    De = (c == null ? void 0 : c.ed25519_credentials) ?? [];
  async function Be(ae) {
    if (
      !ye ||
      !r ||
      G.current[ae.section] ||
      !window.confirm(ae.confirmMessage)
    )
      return;
    const z = ae.section === 'passkey' ? D : te;
    ((G.current[ae.section] = !0),
      V((q) => ({ ...q, [ae.section]: !0 })),
      z(''));
    try {
      const q = await fetch(new URL(ae.path, l.authOrigin), {
        method: 'DELETE',
        headers: { authorization: `Bearer ${J}` },
      });
      if (!q.ok) throw new Error(`Delete failed with status ${q.status}`);
      await Ye({
        warningMessage:
          'Credential deleted, but current account data could not be refreshed.',
      });
    } catch (q) {
      z(q instanceof Error ? q.message : 'Delete failed');
    } finally {
      ((G.current[ae.section] = !1), V((q) => ({ ...q, [ae.section]: !1 })));
    }
  }
  return h.jsx(vl, {
    title: 'Credentials',
    description:
      'Inspect the current account credentials and remove bound authenticators when needed.',
    children: h.jsxs('div', {
      className: 'space-y-6',
      children: [
        d
          ? h.jsx('p', {
              className: 'text-sm text-slate-600',
              children: 'Loading current account…',
            })
          : null,
        x
          ? h.jsx('p', { className: 'text-sm text-rose-600', children: x })
          : null,
        v
          ? h.jsx('p', { className: 'text-sm text-amber-700', children: v })
          : null,
        h.jsxs('section', {
          'aria-labelledby': 'credentials-email-heading',
          className:
            'space-y-3 rounded-xl border border-slate-200 bg-white p-4',
          children: [
            h.jsx('h2', {
              id: 'credentials-email-heading',
              className: 'text-sm font-semibold text-slate-950',
              children: 'Email',
            }),
            h.jsx('p', {
              className: 'text-sm text-slate-600',
              children: 'Managed via email OTP sign-in',
            }),
            ne
              ? x
                ? null
                : Re
                  ? h.jsx('div', {
                      className: 'overflow-x-auto',
                      children: h.jsxs('table', {
                        className:
                          'min-w-full text-left text-sm text-slate-700',
                        children: [
                          h.jsx('thead', {
                            children: h.jsxs('tr', {
                              className:
                                'border-b border-slate-200 text-slate-500',
                              children: [
                                h.jsx('th', {
                                  className: 'py-2 pr-4 font-medium',
                                  children: 'Email',
                                }),
                                h.jsx('th', {
                                  className: 'py-2 pr-4 font-medium',
                                  children: 'Type',
                                }),
                                h.jsx('th', {
                                  className: 'py-2 font-medium',
                                  children: 'Status',
                                }),
                              ],
                            }),
                          }),
                          h.jsx('tbody', {
                            children: h.jsxs('tr', {
                              className:
                                'border-b border-slate-100 last:border-0',
                              children: [
                                h.jsx('td', {
                                  className: 'py-3 pr-4',
                                  children: Re,
                                }),
                                h.jsx('td', {
                                  className: 'py-3 pr-4',
                                  children: 'Primary email',
                                }),
                                h.jsx('td', {
                                  className: 'py-3',
                                  children: 'Read-only',
                                }),
                              ],
                            }),
                          }),
                        ],
                      }),
                    })
                  : h.jsx('p', {
                      className: 'text-sm text-slate-600',
                      children:
                        'This account does not currently have a bound email.',
                    })
              : h.jsx('p', {
                  className: 'text-sm text-slate-600',
                  children: 'Sign in to inspect the current account email.',
                }),
          ],
        }),
        h.jsxs('section', {
          'aria-labelledby': 'credentials-passkey-heading',
          className:
            'space-y-3 rounded-xl border border-slate-200 bg-white p-4',
          children: [
            h.jsx('h2', {
              id: 'credentials-passkey-heading',
              className: 'text-sm font-semibold text-slate-950',
              children: 'Passkey',
            }),
            h.jsx('p', {
              className: 'text-sm text-slate-600',
              children: 'Review the passkeys currently bound to this account.',
            }),
            B
              ? h.jsx('p', { className: 'text-sm text-rose-600', children: B })
              : null,
            ne
              ? x
                ? null
                : Ee.length > 0
                  ? h.jsx('div', {
                      className: 'overflow-x-auto',
                      children: h.jsxs('table', {
                        className:
                          'min-w-full text-left text-sm text-slate-700',
                        children: [
                          h.jsx('thead', {
                            children: h.jsxs('tr', {
                              className:
                                'border-b border-slate-200 text-slate-500',
                              children: [
                                h.jsx('th', {
                                  className: 'py-2 pr-4 font-medium',
                                  children: 'Credential ID',
                                }),
                                h.jsx('th', {
                                  className: 'py-2 pr-4 font-medium',
                                  children: 'RP ID',
                                }),
                                h.jsx('th', {
                                  className: 'py-2 pr-4 font-medium',
                                  children: 'Last Used',
                                }),
                                h.jsx('th', {
                                  className: 'py-2 pr-4 font-medium',
                                  children: 'Created At',
                                }),
                                h.jsx('th', {
                                  className: 'py-2 font-medium',
                                  children: 'Action',
                                }),
                              ],
                            }),
                          }),
                          h.jsx('tbody', {
                            children: Ee.map((ae) =>
                              h.jsxs(
                                'tr',
                                {
                                  className:
                                    'border-b border-slate-100 last:border-0',
                                  children: [
                                    h.jsx('td', {
                                      className: 'py-3 pr-4',
                                      title: ae.credential_id,
                                      children: Cm(ae.credential_id),
                                    }),
                                    h.jsx('td', {
                                      className: 'py-3 pr-4',
                                      children: ae.rp_id,
                                    }),
                                    h.jsx('td', {
                                      className: 'py-3 pr-4',
                                      children: ae.last_used_at ?? 'Never',
                                    }),
                                    h.jsx('td', {
                                      className: 'py-3 pr-4',
                                      children: ae.created_at,
                                    }),
                                    h.jsx('td', {
                                      className: 'py-3',
                                      children: ye
                                        ? h.jsx(mt, {
                                            disabled: _.passkey,
                                            'aria-label': `Delete passkey ${ae.credential_id}`,
                                            onClick: () =>
                                              void Be({
                                                section: 'passkey',
                                                confirmMessage: `Delete passkey ${ae.credential_id} from the current account? This cannot be undone.`,
                                                path: `/webauthn/credentials/${ae.id}`,
                                              }),
                                            children: _.passkey
                                              ? 'Deleting…'
                                              : 'Delete',
                                          })
                                        : h.jsx('span', {
                                            className: 'text-slate-400',
                                            children: '—',
                                          }),
                                    }),
                                  ],
                                },
                                ae.id,
                              ),
                            ),
                          }),
                        ],
                      }),
                    })
                  : h.jsx('p', {
                      className: 'text-sm text-slate-600',
                      children:
                        'No passkeys are currently bound to this account.',
                    })
              : h.jsx('p', {
                  className: 'text-sm text-slate-600',
                  children: 'Sign in to inspect current passkeys.',
                }),
          ],
        }),
        h.jsxs('section', {
          'aria-labelledby': 'credentials-ed25519-heading',
          className:
            'space-y-3 rounded-xl border border-slate-200 bg-white p-4',
          children: [
            h.jsx('h2', {
              id: 'credentials-ed25519-heading',
              className: 'text-sm font-semibold text-slate-950',
              children: 'Ed25519',
            }),
            h.jsx('p', {
              className: 'text-sm text-slate-600',
              children:
                'Review the device keys currently bound to this account.',
            }),
            k
              ? h.jsx('p', { className: 'text-sm text-rose-600', children: k })
              : null,
            ne
              ? x
                ? null
                : De.length > 0
                  ? h.jsx('div', {
                      className: 'overflow-x-auto',
                      children: h.jsxs('table', {
                        className:
                          'min-w-full text-left text-sm text-slate-700',
                        children: [
                          h.jsx('thead', {
                            children: h.jsxs('tr', {
                              className:
                                'border-b border-slate-200 text-slate-500',
                              children: [
                                h.jsx('th', {
                                  className: 'py-2 pr-4 font-medium',
                                  children: 'Name',
                                }),
                                h.jsx('th', {
                                  className: 'py-2 pr-4 font-medium',
                                  children: 'Public Key',
                                }),
                                h.jsx('th', {
                                  className: 'py-2 pr-4 font-medium',
                                  children: 'Last Used',
                                }),
                                h.jsx('th', {
                                  className: 'py-2 pr-4 font-medium',
                                  children: 'Created At',
                                }),
                                ye
                                  ? h.jsx('th', {
                                      className: 'py-2 font-medium',
                                      children: 'Action',
                                    })
                                  : null,
                              ],
                            }),
                          }),
                          h.jsx('tbody', {
                            children: De.map((ae) =>
                              h.jsxs(
                                'tr',
                                {
                                  className:
                                    'border-b border-slate-100 last:border-0',
                                  children: [
                                    h.jsx('td', {
                                      className: 'py-3 pr-4',
                                      children: ae.name,
                                    }),
                                    h.jsx('td', {
                                      className: 'py-3 pr-4',
                                      title: ae.public_key,
                                      children: Cm(ae.public_key),
                                    }),
                                    h.jsx('td', {
                                      className: 'py-3 pr-4',
                                      children: ae.last_used_at ?? 'Never',
                                    }),
                                    h.jsx('td', {
                                      className: 'py-3 pr-4',
                                      children: ae.created_at,
                                    }),
                                    ye
                                      ? h.jsx('td', {
                                          className: 'py-3',
                                          children: h.jsx(mt, {
                                            disabled: _.ed25519,
                                            'aria-label': `Delete device key ${ae.name}`,
                                            onClick: () =>
                                              void Be({
                                                section: 'ed25519',
                                                confirmMessage: `Delete Ed25519 credential ${ae.name} from the current account? This cannot be undone.`,
                                                path: `/ed25519/credentials/${ae.id}`,
                                              }),
                                            children: _.ed25519
                                              ? 'Deleting…'
                                              : 'Delete',
                                          }),
                                        })
                                      : null,
                                  ],
                                },
                                ae.id,
                              ),
                            ),
                          }),
                        ],
                      }),
                    })
                  : h.jsx('p', {
                      className: 'text-sm text-slate-600',
                      children:
                        'No Ed25519 credentials are currently bound to this account.',
                    })
              : h.jsx('p', {
                  className: 'text-sm text-slate-600',
                  children: 'Sign in to inspect current Ed25519 credentials.',
                }),
          ],
        }),
      ],
    }),
  });
}
function na({ title: l, value: r }) {
  return h.jsxs('section', {
    className:
      'rounded-lg border border-slate-200 bg-slate-950 px-4 py-3 text-slate-100 shadow-sm',
    children: [
      h.jsx('h3', {
        className:
          'mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-300',
        children: l,
      }),
      h.jsx('pre', {
        className:
          'overflow-x-auto whitespace-pre-wrap break-words text-xs leading-5',
        children: JSON.stringify(r, null, 2),
      }),
    ],
  });
}
const it = E.forwardRef(({ className: l, ...r }, u) =>
  h.jsx('input', {
    ref: u,
    className: Dt(
      'flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 shadow-sm outline-none ring-offset-background placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-slate-950',
      l,
    ),
    ...r,
  }),
);
it.displayName = 'Input';
function Ux() {
  const { config: l, sdk: r, session: u } = ln(),
    [c, f] = E.useState(''),
    [d, m] = E.useState(''),
    [x, p] = E.useState(null),
    [v, S] = E.useState(null),
    [b, _] = E.useState(''),
    V = l.status === 'ready' && !!r;
  async function G(D) {
    if ((D.preventDefault(), !!r)) {
      (p('start'), _(''));
      try {
        const k = await r.email.start({ email: c.trim() });
        S(k);
      } catch (k) {
        _(k instanceof Error ? k.message : 'Email start failed');
      } finally {
        p(null);
      }
    }
  }
  async function B(D) {
    if ((D.preventDefault(), !!r)) {
      (p('verify'), _(''));
      try {
        const k = await r.email.verify({ email: c.trim(), code: d.trim() });
        S(k);
      } catch (k) {
        _(k instanceof Error ? k.message : 'OTP verification failed');
      } finally {
        p(null);
      }
    }
  }
  return h.jsx(vl, {
    title: 'Email',
    description:
      'Start an email OTP challenge, then verify it against the shared browser SDK state.',
    children: h.jsxs('div', {
      className: 'space-y-6',
      children: [
        h.jsxs('label', {
          className: 'grid gap-2 text-sm font-medium text-slate-700',
          children: [
            h.jsx('span', { children: 'Email address' }),
            h.jsx(it, {
              'aria-label': 'Email address',
              value: c,
              onChange: (D) => f(D.currentTarget.value),
              placeholder: 'user@example.com',
            }),
          ],
        }),
        h.jsxs('form', {
          className: 'space-y-3',
          onSubmit: G,
          children: [
            h.jsx('div', {
              className: 'text-sm text-slate-600',
              children:
                'Request an OTP email using the configured auth origin.',
            }),
            h.jsx(mt, {
              type: 'submit',
              disabled: !V || x !== null || c.trim() === '',
              children: x === 'start' ? 'Starting…' : 'Start email sign-in',
            }),
          ],
        }),
        h.jsxs('form', {
          className: 'space-y-3',
          onSubmit: B,
          children: [
            h.jsxs('label', {
              className: 'grid gap-2 text-sm font-medium text-slate-700',
              children: [
                h.jsx('span', { children: 'One-time code' }),
                h.jsx(it, {
                  'aria-label': 'One-time code',
                  value: d,
                  onChange: (D) => m(D.currentTarget.value),
                  placeholder: '123456',
                }),
              ],
            }),
            h.jsx(mt, {
              type: 'submit',
              disabled: !V || x !== null || c.trim() === '' || d.trim() === '',
              children: x === 'verify' ? 'Verifying…' : 'Verify OTP',
            }),
          ],
        }),
        b
          ? h.jsx('p', { className: 'text-sm text-rose-600', children: b })
          : null,
        h.jsx(na, { title: 'session', value: u }),
        h.jsx(na, { title: 'last response', value: v }),
      ],
    }),
  });
}
/*! noble-ed25519 - MIT License (c) 2019 Paul Miller (paulmillr.com) */ const Uy =
    {
      p: 0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffedn,
      n: 0x1000000000000000000000000000000014def9dea2f79cd65812631a5cf5d3edn,
      h: 8n,
      a: 0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffecn,
      d: 0x52036cee2b6ffe738cc740797779e89800700a4d4141d8ab75eb4dca135978a3n,
      Gx: 0x216936d3cd6e53fec0a4e231fdd6dc5c692cc7609525a7b2c9562d608f25d51an,
      Gy: 0x6666666666666666666666666666666666666666666666666666666666666658n,
    },
  { p: Fs, n: Ks, Gx: Mm, Gy: Dm, a: Oc, d: Cc, h: kx } = Uy,
  ky = 32,
  Hx = (...l) => {
    'captureStackTrace' in Error &&
      typeof Error.captureStackTrace == 'function' &&
      Error.captureStackTrace(...l);
  },
  ut = (l = '') => {
    const r = new Error(l);
    throw (Hx(r, ut), r);
  },
  Bx = (l) => typeof l == 'bigint',
  qx = (l) => typeof l == 'string',
  Lx = (l) =>
    l instanceof Uint8Array ||
    (ArrayBuffer.isView(l) && l.constructor.name === 'Uint8Array'),
  Cn = (l, r, u = '') => {
    const c = Lx(l),
      f = l == null ? void 0 : l.length,
      d = r !== void 0;
    if (!c || (d && f !== r)) {
      const m = u && `"${u}" `,
        x = d ? ` of length ${r}` : '',
        p = c ? `length=${f}` : `type=${typeof l}`;
      ut(m + 'expected Uint8Array' + x + ', got ' + p);
    }
    return l;
  },
  to = (l) => new Uint8Array(l),
  Hy = (l) => Uint8Array.from(l),
  By = (l, r) => l.toString(16).padStart(r, '0'),
  qy = (l) =>
    Array.from(Cn(l))
      .map((r) => By(r, 2))
      .join(''),
  wa = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 },
  Um = (l) => {
    if (l >= wa._0 && l <= wa._9) return l - wa._0;
    if (l >= wa.A && l <= wa.F) return l - (wa.A - 10);
    if (l >= wa.a && l <= wa.f) return l - (wa.a - 10);
  },
  Ly = (l) => {
    const r = 'hex invalid';
    if (!qx(l)) return ut(r);
    const u = l.length,
      c = u / 2;
    if (u % 2) return ut(r);
    const f = to(c);
    for (let d = 0, m = 0; d < c; d++, m += 2) {
      const x = Um(l.charCodeAt(m)),
        p = Um(l.charCodeAt(m + 1));
      if (x === void 0 || p === void 0) return ut(r);
      f[d] = x * 16 + p;
    }
    return f;
  },
  Yx = () => (globalThis == null ? void 0 : globalThis.crypto),
  Gx = () => {
    var l;
    return (
      ((l = Yx()) == null ? void 0 : l.subtle) ??
      ut('crypto.subtle must be defined, consider polyfill')
    );
  },
  Is = (...l) => {
    const r = to(l.reduce((c, f) => c + Cn(f).length, 0));
    let u = 0;
    return (
      l.forEach((c) => {
        (r.set(c, u), (u += c.length));
      }),
      r
    );
  },
  Ps = BigInt,
  Nn = (l, r, u, c = 'bad number: out of range') =>
    Bx(l) && r <= l && l < u ? l : ut(c),
  Qe = (l, r = Fs) => {
    const u = l % r;
    return u >= 0n ? u : r + u;
  },
  km = (1n << 255n) - 1n,
  re = (l) => {
    l < 0n && ut('negative coordinate');
    let r = (l >> 255n) * 19n + (l & km);
    return ((r = (r >> 255n) * 19n + (r & km)), r % Fs);
  },
  Yy = (l) => Qe(l, Ks),
  Xx = (l, r) => {
    (l === 0n || r <= 0n) && ut('no inverse n=' + l + ' mod=' + r);
    let u = Qe(l, r),
      c = r,
      f = 0n,
      d = 1n;
    for (; u !== 0n; ) {
      const m = c / u,
        x = c % u,
        p = f - d * m;
      ((c = u), (u = x), (f = d), (d = p));
    }
    return c === 1n ? Qe(f, r) : ut('no inverse');
  },
  Mc = (l) => (l instanceof Rn ? l : ut('Point expected')),
  qc = 2n ** 256n,
  ta = class ta {
    constructor(r, u, c, f) {
      en(this, 'X');
      en(this, 'Y');
      en(this, 'Z');
      en(this, 'T');
      const d = qc;
      ((this.X = Nn(r, 0n, d)),
        (this.Y = Nn(u, 0n, d)),
        (this.Z = Nn(c, 1n, d)),
        (this.T = Nn(f, 0n, d)),
        Object.freeze(this));
    }
    static CURVE() {
      return Uy;
    }
    static fromAffine(r) {
      return new ta(r.x, r.y, 1n, re(r.x * r.y));
    }
    static fromBytes(r, u = !1) {
      const c = Cc,
        f = Hy(Cn(r, ky)),
        d = r[31];
      f[31] = d & -129;
      const m = Xy(f);
      Nn(m, 0n, u ? qc : Fs);
      const p = re(m * m),
        v = Qe(p - 1n),
        S = re(c * p + 1n);
      let { isValid: b, value: _ } = Qx(v, S);
      b || ut('bad point: y not sqrt');
      const V = (_ & 1n) === 1n,
        G = (d & 128) !== 0;
      return (
        !u && _ === 0n && G && ut('bad point: x==0, isLastByteOdd'),
        G !== V && (_ = Qe(-_)),
        new ta(_, m, 1n, re(_ * m))
      );
    }
    static fromHex(r, u) {
      return ta.fromBytes(Ly(r), u);
    }
    get x() {
      return this.toAffine().x;
    }
    get y() {
      return this.toAffine().y;
    }
    assertValidity() {
      const r = Oc,
        u = Cc,
        c = this;
      if (c.is0()) return ut('bad point: ZERO');
      const { X: f, Y: d, Z: m, T: x } = c,
        p = re(f * f),
        v = re(d * d),
        S = re(m * m),
        b = re(S * S),
        _ = re(p * r),
        V = re(S * (_ + v)),
        G = Qe(b + re(u * re(p * v)));
      if (V !== G) return ut('bad point: equation left != right (1)');
      const B = re(f * d),
        D = re(m * x);
      return B !== D ? ut('bad point: equation left != right (2)') : this;
    }
    equals(r) {
      const { X: u, Y: c, Z: f } = this,
        { X: d, Y: m, Z: x } = Mc(r),
        p = re(u * x),
        v = re(d * f),
        S = re(c * x),
        b = re(m * f);
      return p === v && S === b;
    }
    is0() {
      return this.equals(gl);
    }
    negate() {
      return new ta(Qe(-this.X), this.Y, this.Z, Qe(-this.T));
    }
    double() {
      const { X: r, Y: u, Z: c } = this,
        f = Oc,
        d = re(r * r),
        m = re(u * u),
        x = re(2n * c * c),
        p = re(f * d),
        v = Qe(r + u),
        S = Qe(re(v * v) - d - m),
        b = Qe(p + m),
        _ = Qe(b - x),
        V = Qe(p - m),
        G = re(S * _),
        B = re(b * V),
        D = re(S * V),
        k = re(_ * b);
      return new ta(G, B, k, D);
    }
    add(r) {
      const { X: u, Y: c, Z: f, T: d } = this,
        { X: m, Y: x, Z: p, T: v } = Mc(r),
        S = Oc,
        b = Cc,
        _ = re(u * m),
        V = re(c * x),
        G = re(re(d * b) * v),
        B = re(f * p),
        D = Qe(re(Qe(u + c) * Qe(m + x)) - _ - V),
        k = Qe(B - G),
        te = Qe(B + G),
        F = Qe(V - re(S * _)),
        I = re(D * k),
        ne = re(te * F),
        W = re(D * F),
        J = re(k * te);
      return new ta(I, ne, J, W);
    }
    subtract(r) {
      return this.add(Mc(r).negate());
    }
    multiply(r, u = !0) {
      if (!u && (r === 0n || this.is0())) return gl;
      if ((Nn(r, 1n, Ks), r === 1n)) return this;
      if (this.equals(zn)) return Ix(r).p;
      let c = gl,
        f = zn;
      for (let d = this; r > 0n; d = d.double(), r >>= 1n)
        r & 1n ? (c = c.add(d)) : u && (f = f.add(d));
      return c;
    }
    multiplyUnsafe(r) {
      return this.multiply(r, !1);
    }
    toAffine() {
      const { X: r, Y: u, Z: c } = this;
      if (this.equals(gl)) return { x: 0n, y: 1n };
      const f = Xx(c, Fs);
      re(c * f) !== 1n && ut('invalid inverse');
      const d = re(r * f),
        m = re(u * f);
      return { x: d, y: m };
    }
    toBytes() {
      const { x: r, y: u } = this.toAffine(),
        c = Gy(u);
      return ((c[31] |= r & 1n ? 128 : 0), c);
    }
    toHex() {
      return qy(this.toBytes());
    }
    clearCofactor() {
      return this.multiply(Ps(kx), !1);
    }
    isSmallOrder() {
      return this.clearCofactor().is0();
    }
    isTorsionFree() {
      let r = this.multiply(Ks / 2n, !1).double();
      return (Ks % 2n && (r = r.add(this)), r.is0());
    }
  };
(en(ta, 'BASE'), en(ta, 'ZERO'));
let Rn = ta;
const zn = new Rn(Mm, Dm, 1n, Qe(Mm * Dm)),
  gl = new Rn(0n, 1n, 1n, 0n);
Rn.BASE = zn;
Rn.ZERO = gl;
const Gy = (l) => Ly(By(Nn(l, 0n, qc), 64)).reverse(),
  Xy = (l) => Ps('0x' + qy(Hy(Cn(l)).reverse())),
  ea = (l, r) => {
    let u = l;
    for (; r-- > 0n; ) u = re(u * u);
    return u;
  },
  Zx = (l) => {
    const r = re(l * l),
      u = re(r * l),
      c = re(ea(u, 2n) * u),
      f = re(ea(c, 1n) * l),
      d = re(ea(f, 5n) * f),
      m = re(ea(d, 10n) * d),
      x = re(ea(m, 20n) * m),
      p = re(ea(x, 40n) * x),
      v = re(ea(p, 80n) * p),
      S = re(ea(v, 80n) * p),
      b = re(ea(S, 10n) * d);
    return { pow_p_5_8: re(ea(b, 2n) * l), b2: u };
  },
  Hm = 0x2b8324804fc1df0b2b4d00993dfbd7a72f431806ad2fe478c4ee1b274a0ea0b0n,
  Qx = (l, r) => {
    const u = re(r * re(r * r)),
      c = re(re(u * u) * r),
      f = Zx(re(l * c)).pow_p_5_8;
    let d = re(l * re(u * f));
    const m = re(r * re(d * d)),
      x = d,
      p = re(d * Hm),
      v = m === l,
      S = m === Qe(-l),
      b = m === Qe(-l * Hm);
    return (
      v && (d = x),
      (S || b) && (d = p),
      (Qe(d) & 1n) === 1n && (d = Qe(-d)),
      { isValid: v || S, value: d }
    );
  },
  Lc = (l) => Yy(Xy(l)),
  ao = (...l) => Vy.sha512Async(Is(...l)),
  Vx = (l) => {
    const r = l.slice(0, 32);
    ((r[0] &= 248), (r[31] &= 127), (r[31] |= 64));
    const u = l.slice(32, 64),
      c = Lc(r),
      f = zn.multiply(c),
      d = f.toBytes();
    return { head: r, prefix: u, scalar: c, point: f, pointBytes: d };
  },
  Zy = (l) => ao(Cn(l, ky)).then(Vx),
  Qy = (l) => Zy(l).then((r) => r.pointBytes),
  Kx = (l) => ao(l.hashable).then(l.finish),
  Jx = (l, r, u) => {
    const { pointBytes: c, scalar: f } = l,
      d = Lc(r),
      m = zn.multiply(d).toBytes();
    return {
      hashable: Is(m, c, u),
      finish: (v) => {
        const S = Yy(d + Lc(v) * f);
        return Cn(Is(m, Gy(S)), 64);
      },
    };
  },
  $x = async (l, r) => {
    const u = Cn(l),
      c = await Zy(r),
      f = await ao(c.prefix, u);
    return Kx(Jx(c, f, u));
  },
  Vy = {
    sha512Async: async (l) => {
      const r = Gx(),
        u = Is(l);
      return to(await r.digest('SHA-512', u.buffer));
    },
    sha512: void 0,
  },
  er = 8,
  Wx = 256,
  Ky = Math.ceil(Wx / er) + 1,
  Yc = 2 ** (er - 1),
  Fx = () => {
    const l = [];
    let r = zn,
      u = r;
    for (let c = 0; c < Ky; c++) {
      ((u = r), l.push(u));
      for (let f = 1; f < Yc; f++) ((u = u.add(r)), l.push(u));
      r = u.double();
    }
    return l;
  };
let Bm;
const qm = (l, r) => {
    const u = r.negate();
    return l ? u : r;
  },
  Ix = (l) => {
    const r = Bm || (Bm = Fx());
    let u = gl,
      c = zn;
    const f = 2 ** er,
      d = f,
      m = Ps(f - 1),
      x = Ps(er);
    for (let p = 0; p < Ky; p++) {
      let v = Number(l & m);
      ((l >>= x), v > Yc && ((v -= d), (l += 1n)));
      const S = p * Yc,
        b = S,
        _ = S + Math.abs(v) - 1,
        V = p % 2 !== 0,
        G = v < 0;
      v === 0 ? (c = c.add(qm(V, r[b]))) : (u = u.add(qm(G, r[_])));
    }
    return (l !== 0n && ut('invalid wnaf'), { p: u, f: c });
  },
  gi = 'Expected base64url-encoded 32-byte value';
Vy.sha512Async = async (l) => {
  const r = await crypto.subtle.digest('SHA-512', Uint8Array.from(l));
  return new Uint8Array(r);
};
function tr(l) {
  let r = '';
  for (const u of l) r += String.fromCharCode(u);
  return btoa(r).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
function no(l) {
  const r = l.trim();
  if (!/^[A-Za-z0-9_-]+$/.test(r)) throw new Error(gi);
  try {
    const u = r.padEnd(Math.ceil(r.length / 4) * 4, '='),
      c = atob(u.replace(/-/g, '+').replace(/_/g, '/')),
      f = Uint8Array.from(c, (d) => d.charCodeAt(0));
    if (f.length !== 32) throw new Error(gi);
    return f;
  } catch {
    throw new Error(gi);
  }
}
function Lm(l) {
  if (l.trim() === '') return gi;
  try {
    return (no(l), '');
  } catch (r) {
    return r instanceof Error ? r.message : gi;
  }
}
async function Px(l) {
  const r = await Qy(no(l));
  return tr(r);
}
async function eS(l, r) {
  const u = await $x(new TextEncoder().encode(r), no(l));
  return tr(u);
}
async function Jy() {
  const l = crypto.getRandomValues(new Uint8Array(32)),
    r = await Qy(l);
  return { seed: tr(l), publicKey: tr(r) };
}
function tS() {
  const { adoptDemoSession: l, config: r, sdk: u, session: c } = ln(),
    [f, d] = E.useState(''),
    [m, x] = E.useState(''),
    [p, v] = E.useState(''),
    [S, b] = E.useState(''),
    [_, V] = E.useState(''),
    [G, B] = E.useState(''),
    [D, k] = E.useState(''),
    [te, F] = E.useState(''),
    [I, ne] = E.useState(null),
    [W, J] = E.useState(''),
    [Z, ye] = E.useState(''),
    [Ye, Re] = E.useState({ register: null, signIn: null }),
    [Ee, De] = E.useState(null),
    [Be, ae] = E.useState(!1),
    [z, q] = E.useState(''),
    [le, ce] = E.useState(''),
    $ = E.useRef(0),
    w = r.status === 'ready' && !!u,
    g = c.authenticated && typeof c.accessToken == 'string',
    A = m.trim() === '' ? '' : Lm(m),
    N = Lm(S),
    Q = S.trim() === '' ? '' : N,
    K = w && g && f.trim() !== '' && m.trim() !== '' && A === '' && I === null,
    P = w && p.trim() !== '' && N === '' && I === null,
    fe = E.useCallback(
      async (pe) => {
        const he = $.current + 1;
        if (
          (($.current = he), !u || r.status !== 'ready' || !c.authenticated)
        ) {
          (De(null), q(''), ce(''), ae(!1));
          return;
        }
        (ae(!0), q(''), (pe != null && pe.warningMessage) || ce(''));
        try {
          const Le = await u.me.fetch();
          if ($.current !== he) return;
          (De(Le), ce(''));
        } catch (Le) {
          if ($.current !== he) return;
          if (pe != null && pe.warningMessage) {
            ce(pe.warningMessage);
            return;
          }
          (De(null),
            q(
              Le instanceof Error
                ? Le.message
                : 'Unable to load current credentials.',
            ));
        } finally {
          $.current === he && ae(!1);
        }
      },
      [r.status, u, c.authenticated, c.sessionId],
    );
  E.useEffect(() => {
    fe();
  }, [fe]);
  function Y(pe) {
    return pe instanceof Error
      ? pe.message
      : typeof pe == 'object' && pe !== null
        ? JSON.stringify(pe)
        : String(pe);
  }
  async function ee() {
    (ne('generate'), J(''));
    try {
      const pe = await Jy();
      (B(pe.seed),
        k(pe.publicKey),
        x(pe.publicKey),
        b(pe.seed),
        V(pe.publicKey));
    } catch (pe) {
      J(Y(pe));
    } finally {
      ne(null);
    }
  }
  async function xe(pe) {
    if ((pe.preventDefault(), !(!u || !P))) {
      (ne('signin'), ye(''));
      try {
        const he = S.trim(),
          Le = await Px(he);
        V(Le);
        const ia = await u.ed25519.start({ credential_id: p.trim() }),
          sn = await eS(he, ia.challenge),
          rn = await u.ed25519.verify({
            request_id: ia.request_id,
            signature: sn,
          });
        (Re((xl) => ({ ...xl, signIn: rn })), await l(rn));
      } catch (he) {
        (ye(Y(he)), Re((Le) => ({ ...Le, signIn: he })));
      } finally {
        ne(null);
      }
    }
  }
  async function Ke(pe) {
    if ((pe.preventDefault(), !(!u || !K))) {
      (ne('register'), J(''));
      try {
        const he = await u.ed25519.register({
          name: f.trim(),
          public_key: m.trim(),
        });
        (await fe({
          warningMessage:
            'Credential registered, but current credential data could not be refreshed.',
        }),
          Re((Le) => ({ ...Le, register: he })),
          F(typeof he.id == 'string' ? he.id : ''));
      } catch (he) {
        (J(Y(he)), Re((Le) => ({ ...Le, register: he })));
      } finally {
        ne(null);
      }
    }
  }
  return h.jsx(vl, {
    title: 'ED25519',
    description:
      'Generate a temporary Ed25519 keypair, register a credential for the current user, or sign in by signing the server challenge in the browser.',
    children: h.jsxs('div', {
      className: 'space-y-6',
      children: [
        h.jsxs('section', {
          className: 'space-y-4',
          children: [
            h.jsx('h2', {
              className: 'text-lg font-semibold',
              children: 'Register a credential',
            }),
            h.jsxs('form', {
              className: 'space-y-4',
              onSubmit: Ke,
              children: [
                h.jsxs('label', {
                  className: 'grid gap-2 text-sm font-medium text-slate-700',
                  children: [
                    h.jsx('span', { children: 'Credential name' }),
                    h.jsx(it, {
                      'aria-label': 'Credential name',
                      value: f,
                      onChange: (pe) => d(pe.currentTarget.value),
                      placeholder: 'Laptop signer',
                    }),
                  ],
                }),
                h.jsxs('label', {
                  className: 'grid gap-2 text-sm font-medium text-slate-700',
                  children: [
                    h.jsx('span', {
                      children: 'Public key (base64url 32-byte)',
                    }),
                    h.jsx(it, {
                      'aria-label': 'Public key (base64url 32-byte)',
                      value: m,
                      onChange: (pe) => x(pe.currentTarget.value),
                      placeholder:
                        'jt2HpVJxALeSteTe7QlqBRiOxVeloHMMImehYhZc9Rg',
                    }),
                  ],
                }),
                A
                  ? h.jsx('p', {
                      className: 'text-sm text-rose-600',
                      children: A,
                    })
                  : null,
                g
                  ? null
                  : h.jsx('p', {
                      className: 'text-sm text-slate-600',
                      children:
                        'Registering an ED25519 credential requires an existing session.',
                    }),
                h.jsxs('div', {
                  className: 'flex flex-wrap gap-3',
                  children: [
                    h.jsx(mt, {
                      type: 'button',
                      disabled: I !== null,
                      onClick: ee,
                      children:
                        I === 'generate'
                          ? 'Generating…'
                          : 'Generate temporary keypair',
                    }),
                    h.jsx(mt, {
                      type: 'submit',
                      disabled: !K,
                      children:
                        I === 'register'
                          ? 'Registering…'
                          : 'Register credential',
                    }),
                  ],
                }),
              ],
            }),
            h.jsxs('div', {
              className:
                'grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 md:grid-cols-2',
              children: [
                h.jsxs('div', {
                  className: 'space-y-1',
                  children: [
                    h.jsx('div', {
                      className: 'font-medium text-slate-950',
                      children: 'Generated seed',
                    }),
                    h.jsx('div', {
                      className: 'break-all font-mono text-xs',
                      children: G || 'None generated yet.',
                    }),
                  ],
                }),
                h.jsxs('div', {
                  className: 'space-y-1',
                  children: [
                    h.jsx('div', {
                      className: 'font-medium text-slate-950',
                      children: 'Generated public key',
                    }),
                    h.jsx('div', {
                      className: 'break-all font-mono text-xs',
                      children: D || 'None generated yet.',
                    }),
                  ],
                }),
                h.jsxs('div', {
                  className: 'space-y-1 md:col-span-2',
                  children: [
                    h.jsx('div', {
                      className: 'font-medium text-slate-950',
                      children: 'Last registered credential id',
                    }),
                    h.jsx('div', {
                      className: 'break-all font-mono text-xs',
                      children: te || 'No credential registered yet.',
                    }),
                  ],
                }),
              ],
            }),
            W
              ? h.jsx('p', { className: 'text-sm text-rose-600', children: W })
              : null,
          ],
        }),
        h.jsxs('section', {
          className: 'space-y-4',
          children: [
            h.jsx('h2', {
              className: 'text-lg font-semibold',
              children: 'Sign in with private key',
            }),
            w
              ? null
              : h.jsx('p', {
                  className: 'text-sm text-slate-600',
                  children: 'Complete setup before using ED25519 actions.',
                }),
            h.jsxs('form', {
              className: 'space-y-4',
              onSubmit: xe,
              children: [
                h.jsxs('label', {
                  className: 'grid gap-2 text-sm font-medium text-slate-700',
                  children: [
                    h.jsx('span', { children: 'Credential id' }),
                    h.jsx(it, {
                      'aria-label': 'Credential id',
                      value: p,
                      onChange: (pe) => v(pe.currentTarget.value),
                      placeholder: 'cred_123',
                    }),
                  ],
                }),
                h.jsxs('label', {
                  className: 'grid gap-2 text-sm font-medium text-slate-700',
                  children: [
                    h.jsx('span', { children: 'Seed (base64url 32-byte)' }),
                    h.jsx(it, {
                      'aria-label': 'Seed (base64url 32-byte)',
                      value: S,
                      onChange: (pe) => b(pe.currentTarget.value),
                      placeholder:
                        '7rANewlCLceTsUo9feN0DLjnu-ayYsdhkVWvHT4FelM',
                    }),
                  ],
                }),
                Q
                  ? h.jsx('p', {
                      className: 'text-sm text-rose-600',
                      children: Q,
                    })
                  : null,
                h.jsxs('div', {
                  className: 'flex flex-wrap gap-3',
                  children: [
                    h.jsx(mt, {
                      type: 'button',
                      disabled: G === '' || I !== null,
                      onClick: () => {
                        (b(G), V(D));
                      },
                      children: 'Use current generated seed',
                    }),
                    h.jsx(mt, {
                      type: 'button',
                      disabled: te === '' || I !== null,
                      onClick: () => v(te),
                      children: 'Use last registered credential id',
                    }),
                    h.jsx(mt, {
                      type: 'submit',
                      disabled: !P,
                      children:
                        I === 'signin'
                          ? 'Signing in…'
                          : 'Sign in with private key',
                    }),
                  ],
                }),
              ],
            }),
            h.jsxs('div', {
              className:
                'rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700',
              children: [
                h.jsx('div', {
                  className: 'font-medium text-slate-950',
                  children: 'Derived public key',
                }),
                h.jsx('div', {
                  className: 'mt-1 break-all font-mono text-xs',
                  children: _ || 'No seed-derived public key yet.',
                }),
              ],
            }),
            Z
              ? h.jsx('p', { className: 'text-sm text-rose-600', children: Z })
              : null,
          ],
        }),
        h.jsxs('div', {
          className: 'grid gap-4 xl:grid-cols-3',
          children: [
            h.jsx(na, { title: 'session', value: c }),
            h.jsx(na, { title: 'last responses', value: Ye }),
            h.jsxs('div', {
              className: 'space-y-3',
              children: [
                Be
                  ? h.jsx('p', {
                      className: 'text-sm text-slate-600',
                      children: 'Loading current credentials…',
                    })
                  : null,
                z
                  ? h.jsx('p', {
                      className: 'text-sm text-rose-600',
                      children: z,
                    })
                  : null,
                le
                  ? h.jsx('p', {
                      className: 'text-sm text-amber-700',
                      children: le,
                    })
                  : null,
                h.jsx(na, {
                  title: 'current credentials',
                  value: z
                    ? null
                    : ((Ee == null ? void 0 : Ee.ed25519_credentials) ?? []),
                }),
              ],
            }),
          ],
        }),
      ],
    }),
  });
}
const aS = [
    {
      title: 'Keep auth in your stack',
      description:
        'Self-host the auth server, keep service ownership, and keep auth data under your control instead of outsourcing the core identity path.',
    },
    {
      title: 'Start password-less by default',
      description:
        'Email OTP and passkeys cover the main browser sign-in path without adding another password reset system.',
    },
    {
      title: 'Verify API access cleanly',
      description:
        'Issue short-lived JWT access tokens with refresh tokens and JWKS so frontends and APIs can integrate against a familiar auth-server contract.',
    },
    {
      title: 'Operate with SQLite simplicity',
      description:
        'Run auth with a single SQLite file that is easy to inspect, back up, move, and deploy without another database tier.',
    },
  ],
  nS = [
    'Email OTP',
    'Passkey sign-in',
    'Session state',
    'JWT access + refresh tokens',
    'JWKS for backend verification',
    'Cross-origin frontend integration',
  ],
  lS = [
    'A self-hosted auth server for browser apps and backend token verification.',
    'A smaller auth core with clear operational ownership and predictable data flow.',
    'A product that needs authentication without bundling authorization or user-management scope.',
  ],
  iS = [
    'Authorization models such as RBAC, ACLs, roles, permissions, or groups.',
    'Social login providers or enterprise identity federation.',
    'SMS or TOTP multi-factor flows.',
    'User profiles, admin backoffice tooling, or a general user-management suite.',
  ];
function sS() {
  const { config: l } = ln();
  return h.jsxs('div', {
    className: 'space-y-8',
    children: [
      h.jsx('section', {
        className:
          'rounded-3xl border border-slate-200 bg-white px-6 py-8 shadow-sm sm:px-8',
        children: h.jsxs('div', {
          className: 'space-y-4',
          children: [
            h.jsx('p', {
              className:
                'text-sm font-semibold uppercase tracking-[0.2em] text-slate-500',
              children: 'Official auth-mini Auth Server demo',
            }),
            h.jsxs('div', {
              className: 'space-y-3',
              children: [
                h.jsx('h1', {
                  className:
                    'max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl',
                  children: 'Minimal Self-Hosted Auth Server for your Apps',
                }),
                h.jsx('p', {
                  className:
                    'max-w-3xl text-base leading-7 text-slate-600 sm:text-lg',
                  children:
                    'Run a self-hosted auth core for your apps with email OTP, passkeys, sessions, and JWKS-backed token verification while keeping service ownership and user data in your stack.',
                }),
                h.jsx('p', {
                  className: 'max-w-3xl text-sm leading-6 text-slate-500',
                  children:
                    'This is the default product overview for the official demo. Setup, Email, Passkey, and Session still exist as proof-flow pages inside the current app shell when you want to validate the implementation.',
                }),
              ],
            }),
            h.jsx('div', {
              className:
                'rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700',
              children:
                l.status === 'ready'
                  ? 'Demo setup status: ready — auth origin configured for interactive browser flows.'
                  : 'Demo setup status: visit Setup to connect an auth origin before trying live browser flows.',
            }),
          ],
        }),
      }),
      h.jsxs('section', {
        className: 'space-y-4',
        children: [
          h.jsxs('div', {
            className: 'space-y-2',
            children: [
              h.jsx('h2', {
                className: 'text-2xl font-semibold text-slate-950',
                children: 'Why teams pick auth-mini',
              }),
              h.jsx('p', {
                className: 'max-w-3xl text-sm leading-6 text-slate-600',
                children:
                  'The value proposition stays narrow on purpose: a trustworthy auth server core that covers the common sign-in and token-verification path without turning into a larger identity platform.',
              }),
            ],
          }),
          h.jsx('div', {
            className: 'grid gap-4 md:grid-cols-2',
            children: aS.map((r) =>
              h.jsx(
                Zs,
                {
                  className: 'h-full',
                  children: h.jsxs(Qs, {
                    children: [
                      h.jsx(Dy, { children: r.title }),
                      h.jsx(Vs, { children: r.description }),
                    ],
                  }),
                },
                r.title,
              ),
            ),
          }),
        ],
      }),
      h.jsx('section', {
        className:
          'rounded-3xl border border-slate-200 bg-slate-950 px-6 py-6 text-white shadow-sm',
        children: h.jsxs('div', {
          className: 'space-y-4',
          children: [
            h.jsx('h2', {
              className: 'text-2xl font-semibold',
              children: 'Auth server capabilities',
            }),
            h.jsx('p', {
              className: 'max-w-3xl text-sm leading-6 text-slate-300',
              children:
                'Scan the auth core quickly, then dive into the dedicated demo routes only when you want hands-on verification.',
            }),
            h.jsx('div', {
              className: 'flex flex-wrap gap-2',
              children: nS.map((r) =>
                h.jsx(
                  'span',
                  {
                    className:
                      'rounded-full border border-white/15 bg-white/10 px-3 py-1 text-sm text-white',
                    children: r,
                  },
                  r,
                ),
              ),
            }),
          ],
        }),
      }),
      h.jsxs('section', {
        className: 'grid gap-4 lg:grid-cols-2',
        children: [
          h.jsxs(Zs, {
            className: 'h-full',
            children: [
              h.jsxs(Qs, {
                children: [
                  h.jsx('h3', {
                    className: 'text-lg font-semibold text-slate-950',
                    children: 'Good fit',
                  }),
                  h.jsx(Vs, {
                    children:
                      'Choose auth-mini when you want a self-hosted authentication core with clear scope and a backend-friendly verification story.',
                  }),
                ],
              }),
              h.jsx(Bc, {
                children: h.jsx('ul', {
                  className: 'space-y-3 text-sm leading-6 text-slate-600',
                  children: lS.map((r) =>
                    h.jsxs(
                      'li',
                      {
                        className: 'flex gap-3',
                        children: [
                          h.jsx('span', {
                            className:
                              'mt-2 h-2 w-2 rounded-full bg-emerald-500',
                          }),
                          h.jsx('span', { children: r }),
                        ],
                      },
                      r,
                    ),
                  ),
                }),
              }),
            ],
          }),
          h.jsxs(Zs, {
            className: 'h-full border-amber-200 bg-amber-50/60',
            children: [
              h.jsxs(Qs, {
                children: [
                  h.jsx('h3', {
                    className: 'text-lg font-semibold text-slate-950',
                    children: 'Not included',
                  }),
                  h.jsx(Vs, {
                    children:
                      'Keep the boundary explicit so the homepage does not imply a full identity platform or broader product suite.',
                  }),
                ],
              }),
              h.jsx(Bc, {
                children: h.jsx('ul', {
                  className: 'space-y-3 text-sm leading-6 text-slate-700',
                  children: iS.map((r) =>
                    h.jsxs(
                      'li',
                      {
                        className: 'flex gap-3',
                        children: [
                          h.jsx('span', {
                            className: 'mt-2 h-2 w-2 rounded-full bg-amber-500',
                          }),
                          h.jsx('span', { children: r }),
                        ],
                      },
                      r,
                    ),
                  ),
                }),
              }),
            ],
          }),
        ],
      }),
      h.jsx('section', {
        className:
          'rounded-3xl border border-slate-200 bg-white px-6 py-6 shadow-sm',
        children: h.jsxs('div', {
          className: 'space-y-4',
          children: [
            h.jsxs('div', {
              className: 'space-y-2',
              children: [
                h.jsx('h2', {
                  className: 'text-2xl font-semibold text-slate-950',
                  children: 'Validate the browser flows when you are ready',
                }),
                h.jsx('p', {
                  className: 'max-w-3xl text-sm leading-6 text-slate-600',
                  children:
                    'Use Setup to connect your auth origin, then move through Email, Passkey, and Session to inspect the product in action without turning the homepage into a setup checklist.',
                }),
              ],
            }),
            h.jsxs('div', {
              className: 'flex flex-wrap gap-3',
              children: [
                h.jsx($s, {
                  to: '/setup',
                  className:
                    'inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700',
                  children: 'Start with official Auth Server setup',
                }),
                h.jsx($s, {
                  to: '/email',
                  className:
                    'inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100',
                  children: 'Try browser auth flows',
                }),
              ],
            }),
          ],
        }),
      }),
    ],
  });
}
function rS() {
  const { config: l, sdk: r, session: u } = ln(),
    [c, f] = E.useState(null),
    [d, m] = E.useState(null),
    [x, p] = E.useState(''),
    [v, S] = E.useState(null),
    [b, _] = E.useState(!1),
    [V, G] = E.useState(''),
    [B, D] = E.useState(''),
    k = E.useRef(0),
    te = l.status === 'ready' && !!r,
    F = te && u.authenticated && v !== null,
    I = E.useCallback(
      async (W) => {
        const J = k.current + 1;
        if (((k.current = J), !r || l.status !== 'ready' || !u.authenticated)) {
          (S(null), G(''), D(''), _(!1));
          return;
        }
        (_(!0), G(''), (W != null && W.warningMessage) || D(''));
        try {
          const Z = await r.me.fetch();
          if (k.current !== J) return;
          (S(Z), D(''));
        } catch (Z) {
          if (k.current !== J) return;
          if (W != null && W.warningMessage) {
            D(W.warningMessage);
            return;
          }
          (S(null),
            G(Z instanceof Error ? Z.message : 'Unable to load current user.'));
        } finally {
          k.current === J && _(!1);
        }
      },
      [l.status, r, u.authenticated, u.sessionId],
    );
  E.useEffect(() => {
    I();
  }, [I]);
  async function ne(W) {
    if (!(!r || (W === 'register' && !F))) {
      (f(W), p(''), m(null));
      try {
        const J =
          W === 'register'
            ? await r.passkey.register()
            : await r.passkey.authenticate();
        (W === 'register' &&
          (await I({
            warningMessage:
              'Passkey registered, but current user data could not be refreshed.',
          })),
          m(J));
      } catch (J) {
        p(J instanceof Error ? J.message : `Passkey ${W} failed`);
      } finally {
        f(null);
      }
    }
  }
  return h.jsx(vl, {
    title: 'Passkey',
    description:
      'Trigger passkey registration or sign-in while reusing the shared SDK and session state.',
    children: h.jsxs('div', {
      className: 'space-y-6',
      children: [
        h.jsx('p', {
          className: 'text-sm text-slate-600',
          children:
            'Use these controls once setup is connected to exercise the current SDK wiring.',
        }),
        h.jsxs('div', {
          className: 'flex flex-wrap gap-3',
          children: [
            h.jsx(mt, {
              disabled: !F || c !== null,
              onClick: () => void ne('register'),
              children: c === 'register' ? 'Registering…' : 'Register passkey',
            }),
            h.jsx(mt, {
              disabled: !te || c !== null,
              onClick: () => void ne('authenticate'),
              children:
                c === 'authenticate' ? 'Signing in…' : 'Sign in with passkey',
            }),
          ],
        }),
        F
          ? null
          : h.jsx('p', {
              className: 'text-sm text-slate-600',
              children:
                'Register a passkey after signing in with an existing session.',
            }),
        b
          ? h.jsx('p', {
              className: 'text-sm text-slate-600',
              children: 'Loading current user…',
            })
          : null,
        V
          ? h.jsx('p', { className: 'text-sm text-rose-600', children: V })
          : null,
        B
          ? h.jsx('p', { className: 'text-sm text-amber-700', children: B })
          : null,
        x
          ? h.jsx('p', { className: 'text-sm text-rose-600', children: x })
          : null,
        h.jsx(na, { title: 'session', value: u }),
        h.jsx(na, { title: 'current user', value: v }),
        h.jsx(na, { title: 'last response', value: d }),
      ],
    }),
  });
}
function uS(l) {
  return typeof l == 'object' && l !== null ? l : null;
}
function cS(l) {
  const r = l.replace(/-/g, '+').replace(/_/g, '/'),
    u = (4 - (r.length % 4)) % 4;
  return atob(`${r}${'='.repeat(u)}`);
}
function oS(l) {
  const [, r] = l.split('.');
  if (!r) return null;
  try {
    return uS(JSON.parse(cS(r)));
  } catch {
    return null;
  }
}
function Ym(l) {
  const r = oS(l);
  if (!r) return 'not-manageable';
  if (!('amr' in r)) return 'legacy-token';
  const u = Array.isArray(r.amr)
    ? r.amr.filter((c) => typeof c == 'string')
    : [];
  return u.length === 0
    ? 'not-manageable'
    : u.includes('email_otp') || u.includes('webauthn')
      ? 'manageable'
      : 'not-manageable';
}
function fS(l) {
  return l == null || l.trim() === '' ? 'Unavailable' : l;
}
function dS(l) {
  return l == null || l.trim() === ''
    ? 'Unavailable'
    : l.length > 48
      ? `${l.slice(0, 45)}...`
      : l;
}
function hS() {
  const { clearLocalAuthState: l, config: r, sdk: u, session: c } = ln(),
    [f, d] = E.useState(null),
    [m, x] = E.useState(!1),
    [p, v] = E.useState(''),
    [S, b] = E.useState(''),
    _ = E.useRef(0),
    [V, G] = E.useState(null),
    [B, D] = E.useState(''),
    k = (f == null ? void 0 : f.active_sessions) ?? [],
    te = E.useCallback(
      async (I) => {
        const ne = _.current + 1;
        if (
          ((_.current = ne), !u || r.status !== 'ready' || !c.authenticated)
        ) {
          (d(null), v(''), b(''), x(!1));
          return;
        }
        (x(!0), v(''), (I != null && I.warningMessage) || b(''));
        try {
          const W = await u.me.fetch();
          if (_.current !== ne) return;
          (d(W), b(''));
        } catch (W) {
          if (_.current !== ne) return;
          if (I != null && I.warningMessage) {
            b(I.warningMessage);
            return;
          }
          (d(null),
            v(W instanceof Error ? W.message : 'Unable to load current user.'));
        } finally {
          _.current === ne && x(!1);
        }
      },
      [r.status, u, c.authenticated, c.sessionId],
    );
  E.useEffect(() => {
    te();
  }, [te]);
  async function F(I) {
    if (V === null) {
      if (!u || !c.accessToken || r.status !== 'ready') {
        D('Unable to kick session.');
        return;
      }
      (D(''), G(I));
      try {
        let ne = c.accessToken;
        if (Ym(ne) === 'legacy-token' && c.refreshToken) {
          const Z = await u.session.refresh();
          typeof Z.accessToken == 'string' && (ne = Z.accessToken);
        }
        if (Ym(ne) !== 'manageable') throw new Error('Unable to kick session.');
        if (
          !(
            await fetch(new URL(`/session/${I}/logout`, r.authOrigin), {
              method: 'POST',
              headers: { authorization: `Bearer ${ne}` },
            })
          ).ok
        )
          throw new Error('Unable to kick session.');
        (await te({
          warningMessage:
            'Session updated, but current user data could not be refreshed.',
        }),
          D(''));
      } catch {
        D('Unable to kick session.');
      } finally {
        G(null);
      }
    }
  }
  return h.jsx(vl, {
    title: 'Session',
    description:
      'Inspect the current auth snapshot and clear local state when needed.',
    children: h.jsxs('div', {
      className: 'space-y-6',
      children: [
        h.jsxs('div', {
          className:
            'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between',
          children: [
            h.jsx('p', {
              className: 'max-w-2xl text-sm text-slate-600',
              children:
                'The session page owns its own authenticated profile fetch so refreshes stay local to this route.',
            }),
            h.jsx(mt, {
              onClick: () => void l(),
              children: 'Clear local auth state',
            }),
          ],
        }),
        h.jsxs('div', {
          className: 'grid gap-4 lg:grid-cols-2',
          children: [
            h.jsx(na, {
              title: 'Current session',
              value: c ?? { status: r.status },
            }),
            h.jsx(na, { title: 'Current user', value: f }),
          ],
        }),
        m
          ? h.jsx('p', {
              className: 'text-sm text-slate-600',
              children: 'Loading current user…',
            })
          : null,
        p
          ? h.jsx('p', { className: 'text-sm text-rose-600', children: p })
          : null,
        S
          ? h.jsx('p', { className: 'text-sm text-amber-700', children: S })
          : null,
        h.jsxs('section', {
          'aria-labelledby': 'active-sessions-heading',
          className:
            'space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4',
          children: [
            h.jsxs('div', {
              className: 'space-y-1',
              children: [
                h.jsx('h3', {
                  id: 'active-sessions-heading',
                  className: 'text-base font-semibold text-slate-950',
                  children: 'Active sessions',
                }),
                h.jsx('p', {
                  className: 'text-sm text-slate-600',
                  children:
                    'Review every active session in the current snapshot and kick peers as needed.',
                }),
              ],
            }),
            B
              ? h.jsx('p', {
                  className: 'text-sm text-rose-600',
                  children: 'Unable to kick session.',
                })
              : null,
            c.authenticated
              ? p
                ? null
                : k.length === 0
                  ? h.jsx('p', {
                      className: 'text-sm text-slate-600',
                      children: 'No active sessions.',
                    })
                  : h.jsx('div', {
                      className: 'overflow-x-auto',
                      children: h.jsxs('table', {
                        className: 'min-w-full border-collapse text-sm',
                        children: [
                          h.jsx('thead', {
                            children: h.jsxs('tr', {
                              className:
                                'border-b border-slate-200 text-left text-slate-600',
                              children: [
                                h.jsx('th', {
                                  className: 'px-3 py-2 font-medium',
                                  children: 'Session ID',
                                }),
                                h.jsx('th', {
                                  className: 'px-3 py-2 font-medium',
                                  children: 'Auth Method',
                                }),
                                h.jsx('th', {
                                  className: 'px-3 py-2 font-medium',
                                  children: 'Created At',
                                }),
                                h.jsx('th', {
                                  className: 'px-3 py-2 font-medium',
                                  children: 'Expires At',
                                }),
                                h.jsx('th', {
                                  className: 'px-3 py-2 font-medium',
                                  children: 'IP',
                                }),
                                h.jsx('th', {
                                  className: 'px-3 py-2 font-medium',
                                  children: 'User-Agent',
                                }),
                                h.jsx('th', {
                                  className: 'px-3 py-2 font-medium',
                                  children: 'Action',
                                }),
                              ],
                            }),
                          }),
                          h.jsx('tbody', {
                            children: k.map((I) => {
                              const ne = V === I.id;
                              return h.jsxs(
                                'tr',
                                {
                                  className:
                                    'border-b border-slate-200 last:border-b-0',
                                  children: [
                                    h.jsx('td', {
                                      className:
                                        'px-3 py-2 font-mono text-xs text-slate-950',
                                      children: I.id,
                                    }),
                                    h.jsx('td', {
                                      className:
                                        'px-3 py-2 font-mono text-xs text-slate-950',
                                      children: I.auth_method,
                                    }),
                                    h.jsx('td', {
                                      className:
                                        'px-3 py-2 font-mono text-xs text-slate-950',
                                      children: I.created_at,
                                    }),
                                    h.jsx('td', {
                                      className:
                                        'px-3 py-2 font-mono text-xs text-slate-950',
                                      children: I.expires_at,
                                    }),
                                    h.jsx('td', {
                                      className:
                                        'px-3 py-2 font-mono text-xs text-slate-950',
                                      children: fS(I.ip),
                                    }),
                                    h.jsx('td', {
                                      className:
                                        'px-3 py-2 font-mono text-xs text-slate-950',
                                      children: dS(I.user_agent),
                                    }),
                                    h.jsx('td', {
                                      className: 'px-3 py-2',
                                      children: h.jsx(mt, {
                                        disabled: ne,
                                        onClick: () => void F(I.id),
                                        children: ne ? 'Kicking...' : 'Kick',
                                      }),
                                    }),
                                  ],
                                },
                                I.id,
                              );
                            }),
                          }),
                        ],
                      }),
                    })
              : h.jsx('p', {
                  className: 'text-sm text-slate-600',
                  children: 'No active sessions.',
                }),
          ],
        }),
      ],
    }),
  });
}
const mS = {
  bodySerializer: (l) =>
    JSON.stringify(l, (r, u) => (typeof u == 'bigint' ? u.toString() : u)),
};
function yS({
  onRequest: l,
  onSseError: r,
  onSseEvent: u,
  responseTransformer: c,
  responseValidator: f,
  sseDefaultRetryDelay: d,
  sseMaxRetryAttempts: m,
  sseMaxRetryDelay: x,
  sseSleepFn: p,
  url: v,
  ...S
}) {
  let b;
  const _ = p ?? ((B) => new Promise((D) => setTimeout(D, B)));
  return {
    stream: (async function* () {
      let B = d ?? 3e3,
        D = 0;
      const k = S.signal ?? new AbortController().signal;
      for (; !k.aborted; ) {
        D++;
        const te =
          S.headers instanceof Headers ? S.headers : new Headers(S.headers);
        b !== void 0 && te.set('Last-Event-ID', b);
        try {
          const F = {
            redirect: 'follow',
            ...S,
            body: S.serializedBody,
            headers: te,
            signal: k,
          };
          let I = new Request(v, F);
          l && (I = await l(v, F));
          const W = await (S.fetch ?? globalThis.fetch)(I);
          if (!W.ok) throw new Error(`SSE failed: ${W.status} ${W.statusText}`);
          if (!W.body) throw new Error('No body in SSE response');
          const J = W.body.pipeThrough(new TextDecoderStream()).getReader();
          let Z = '';
          const ye = () => {
            try {
              J.cancel();
            } catch {}
          };
          k.addEventListener('abort', ye);
          try {
            for (;;) {
              const { done: Ye, value: Re } = await J.read();
              if (Ye) break;
              ((Z += Re),
                (Z = Z.replace(
                  /\r\n?/g,
                  `
`,
                )));
              const Ee = Z.split(`

`);
              Z = Ee.pop() ?? '';
              for (const De of Ee) {
                const Be = De.split(`
`),
                  ae = [];
                let z;
                for (const ce of Be)
                  if (ce.startsWith('data:'))
                    ae.push(ce.replace(/^data:\s*/, ''));
                  else if (ce.startsWith('event:'))
                    z = ce.replace(/^event:\s*/, '');
                  else if (ce.startsWith('id:')) b = ce.replace(/^id:\s*/, '');
                  else if (ce.startsWith('retry:')) {
                    const $ = Number.parseInt(ce.replace(/^retry:\s*/, ''), 10);
                    Number.isNaN($) || (B = $);
                  }
                let q,
                  le = !1;
                if (ae.length) {
                  const ce = ae.join(`
`);
                  try {
                    ((q = JSON.parse(ce)), (le = !0));
                  } catch {
                    q = ce;
                  }
                }
                (le && (f && (await f(q)), c && (q = await c(q))),
                  u == null || u({ data: q, event: z, id: b, retry: B }),
                  ae.length && (yield q));
              }
            }
          } finally {
            (k.removeEventListener('abort', ye), J.releaseLock());
          }
          break;
        } catch (F) {
          if ((r == null || r(F), m !== void 0 && D >= m)) break;
          const I = Math.min(B * 2 ** (D - 1), x ?? 3e4);
          await _(I);
        }
      }
    })(),
  };
}
const pS = (l) => {
    switch (l) {
      case 'label':
        return '.';
      case 'matrix':
        return ';';
      case 'simple':
        return ',';
      default:
        return '&';
    }
  },
  gS = (l) => {
    switch (l) {
      case 'form':
        return ',';
      case 'pipeDelimited':
        return '|';
      case 'spaceDelimited':
        return '%20';
      default:
        return ',';
    }
  },
  bS = (l) => {
    switch (l) {
      case 'label':
        return '.';
      case 'matrix':
        return ';';
      case 'simple':
        return ',';
      default:
        return '&';
    }
  },
  $y = ({ allowReserved: l, explode: r, name: u, style: c, value: f }) => {
    if (!r) {
      const x = (l ? f : f.map((p) => encodeURIComponent(p))).join(gS(c));
      switch (c) {
        case 'label':
          return `.${x}`;
        case 'matrix':
          return `;${u}=${x}`;
        case 'simple':
          return x;
        default:
          return `${u}=${x}`;
      }
    }
    const d = pS(c),
      m = f
        .map((x) =>
          c === 'label' || c === 'simple'
            ? l
              ? x
              : encodeURIComponent(x)
            : ir({ allowReserved: l, name: u, value: x }),
        )
        .join(d);
    return c === 'label' || c === 'matrix' ? d + m : m;
  },
  ir = ({ allowReserved: l, name: r, value: u }) => {
    if (u == null) return '';
    if (typeof u == 'object')
      throw new Error(
        'Deeply-nested arrays/objects aren’t supported. Provide your own `querySerializer()` to handle these.',
      );
    return `${r}=${l ? u : encodeURIComponent(u)}`;
  },
  Wy = ({
    allowReserved: l,
    explode: r,
    name: u,
    style: c,
    value: f,
    valueOnly: d,
  }) => {
    if (f instanceof Date)
      return d ? f.toISOString() : `${u}=${f.toISOString()}`;
    if (c !== 'deepObject' && !r) {
      let p = [];
      Object.entries(f).forEach(([S, b]) => {
        p = [...p, S, l ? b : encodeURIComponent(b)];
      });
      const v = p.join(',');
      switch (c) {
        case 'form':
          return `${u}=${v}`;
        case 'label':
          return `.${v}`;
        case 'matrix':
          return `;${u}=${v}`;
        default:
          return v;
      }
    }
    const m = bS(c),
      x = Object.entries(f)
        .map(([p, v]) =>
          ir({
            allowReserved: l,
            name: c === 'deepObject' ? `${u}[${p}]` : p,
            value: v,
          }),
        )
        .join(m);
    return c === 'label' || c === 'matrix' ? m + x : x;
  },
  vS = /\{[^{}]+\}/g,
  xS = ({ path: l, url: r }) => {
    let u = r;
    const c = r.match(vS);
    if (c)
      for (const f of c) {
        let d = !1,
          m = f.substring(1, f.length - 1),
          x = 'simple';
        (m.endsWith('*') && ((d = !0), (m = m.substring(0, m.length - 1))),
          m.startsWith('.')
            ? ((m = m.substring(1)), (x = 'label'))
            : m.startsWith(';') && ((m = m.substring(1)), (x = 'matrix')));
        const p = l[m];
        if (p == null) continue;
        if (Array.isArray(p)) {
          u = u.replace(f, $y({ explode: d, name: m, style: x, value: p }));
          continue;
        }
        if (typeof p == 'object') {
          u = u.replace(
            f,
            Wy({ explode: d, name: m, style: x, value: p, valueOnly: !0 }),
          );
          continue;
        }
        if (x === 'matrix') {
          u = u.replace(f, `;${ir({ name: m, value: p })}`);
          continue;
        }
        const v = encodeURIComponent(x === 'label' ? `.${p}` : p);
        u = u.replace(f, v);
      }
    return u;
  },
  SS = ({ baseUrl: l, path: r, query: u, querySerializer: c, url: f }) => {
    const d = f.startsWith('/') ? f : `/${f}`;
    let m = (l ?? '') + d;
    r && (m = xS({ path: r, url: m }));
    let x = u ? c(u) : '';
    return (x.startsWith('?') && (x = x.substring(1)), x && (m += `?${x}`), m);
  };
function Gm(l) {
  const r = l.body !== void 0;
  if (r && l.bodySerializer)
    return 'serializedBody' in l
      ? l.serializedBody !== void 0 && l.serializedBody !== ''
        ? l.serializedBody
        : null
      : l.body !== ''
        ? l.body
        : null;
  if (r) return l.body;
}
const ES = async (l, r) => {
    const u = typeof r == 'function' ? await r(l) : r;
    if (u)
      return l.scheme === 'bearer'
        ? `Bearer ${u}`
        : l.scheme === 'basic'
          ? `Basic ${btoa(u)}`
          : u;
  },
  Fy =
    ({ parameters: l = {}, ...r } = {}) =>
    (c) => {
      const f = [];
      if (c && typeof c == 'object')
        for (const d in c) {
          const m = c[d];
          if (m == null) continue;
          const x = l[d] || r;
          if (Array.isArray(m)) {
            const p = $y({
              allowReserved: x.allowReserved,
              explode: !0,
              name: d,
              style: 'form',
              value: m,
              ...x.array,
            });
            p && f.push(p);
          } else if (typeof m == 'object') {
            const p = Wy({
              allowReserved: x.allowReserved,
              explode: !0,
              name: d,
              style: 'deepObject',
              value: m,
              ...x.object,
            });
            p && f.push(p);
          } else {
            const p = ir({ allowReserved: x.allowReserved, name: d, value: m });
            p && f.push(p);
          }
        }
      return f.join('&');
    },
  TS = (l) => {
    var u;
    if (!l) return 'stream';
    const r = (u = l.split(';')[0]) == null ? void 0 : u.trim();
    if (r) {
      if (r.startsWith('application/json') || r.endsWith('+json'))
        return 'json';
      if (r === 'multipart/form-data') return 'formData';
      if (
        ['application/', 'audio/', 'image/', 'video/'].some((c) =>
          r.startsWith(c),
        )
      )
        return 'blob';
      if (r.startsWith('text/')) return 'text';
    }
  },
  AS = (l, r) => {
    var u, c;
    return r
      ? !!(
          l.headers.has(r) ||
          ((u = l.query) != null && u[r]) ||
          ((c = l.headers.get('Cookie')) != null && c.includes(`${r}=`))
        )
      : !1;
  },
  wS = async ({ security: l, ...r }) => {
    for (const u of l) {
      if (AS(r, u.name)) continue;
      const c = await ES(u, r.auth);
      if (!c) continue;
      const f = u.name ?? 'Authorization';
      switch (u.in) {
        case 'query':
          (r.query || (r.query = {}), (r.query[f] = c));
          break;
        case 'cookie':
          r.headers.append('Cookie', `${f}=${c}`);
          break;
        case 'header':
        default:
          r.headers.set(f, c);
          break;
      }
    }
  },
  Xm = (l) =>
    SS({
      baseUrl: l.baseUrl,
      path: l.path,
      query: l.query,
      querySerializer:
        typeof l.querySerializer == 'function'
          ? l.querySerializer
          : Fy(l.querySerializer),
      url: l.url,
    }),
  Zm = (l, r) => {
    var c;
    const u = { ...l, ...r };
    return (
      (c = u.baseUrl) != null &&
        c.endsWith('/') &&
        (u.baseUrl = u.baseUrl.substring(0, u.baseUrl.length - 1)),
      (u.headers = Iy(l.headers, r.headers)),
      u
    );
  },
  jS = (l) => {
    const r = [];
    return (
      l.forEach((u, c) => {
        r.push([c, u]);
      }),
      r
    );
  },
  Iy = (...l) => {
    const r = new Headers();
    for (const u of l) {
      if (!u) continue;
      const c = u instanceof Headers ? jS(u) : Object.entries(u);
      for (const [f, d] of c)
        if (d === null) r.delete(f);
        else if (Array.isArray(d)) for (const m of d) r.append(f, m);
        else
          d !== void 0 &&
            r.set(f, typeof d == 'object' ? JSON.stringify(d) : d);
    }
    return r;
  };
class Dc {
  constructor() {
    en(this, 'fns', []);
  }
  clear() {
    this.fns = [];
  }
  eject(r) {
    const u = this.getInterceptorIndex(r);
    this.fns[u] && (this.fns[u] = null);
  }
  exists(r) {
    const u = this.getInterceptorIndex(r);
    return !!this.fns[u];
  }
  getInterceptorIndex(r) {
    return typeof r == 'number' ? (this.fns[r] ? r : -1) : this.fns.indexOf(r);
  }
  update(r, u) {
    const c = this.getInterceptorIndex(r);
    return this.fns[c] ? ((this.fns[c] = u), r) : !1;
  }
  use(r) {
    return (this.fns.push(r), this.fns.length - 1);
  }
}
const NS = () => ({ error: new Dc(), request: new Dc(), response: new Dc() }),
  RS = Fy({
    allowReserved: !1,
    array: { explode: !0, style: 'form' },
    object: { explode: !0, style: 'deepObject' },
  }),
  zS = { 'Content-Type': 'application/json' },
  Py = (l = {}) => ({
    ...mS,
    headers: zS,
    parseAs: 'auto',
    querySerializer: RS,
    ...l,
  }),
  ep = (l = {}) => {
    let r = Zm(Py(), l);
    const u = () => ({ ...r }),
      c = (S) => ((r = Zm(r, S)), u()),
      f = NS(),
      d = async (S) => {
        const b = {
          ...r,
          ...S,
          fetch: S.fetch ?? r.fetch ?? globalThis.fetch,
          headers: Iy(r.headers, S.headers),
          serializedBody: void 0,
        };
        (b.security && (await wS({ ...b, security: b.security })),
          b.requestValidator && (await b.requestValidator(b)),
          b.body !== void 0 &&
            b.bodySerializer &&
            (b.serializedBody = b.bodySerializer(b.body)),
          (b.body === void 0 || b.serializedBody === '') &&
            b.headers.delete('Content-Type'));
        const _ = b,
          V = Xm(_);
        return { opts: _, url: V };
      },
      m = async (S) => {
        const { opts: b, url: _ } = await d(S),
          V = { redirect: 'follow', ...b, body: Gm(b) };
        let G = new Request(_, V);
        for (const W of f.request.fns) W && (G = await W(G, b));
        const B = b.fetch;
        let D;
        try {
          D = await B(G);
        } catch (W) {
          let J = W;
          for (const Z of f.error.fns) Z && (J = await Z(W, void 0, G, b));
          if (((J = J || {}), b.throwOnError)) throw J;
          return b.responseStyle === 'data'
            ? void 0
            : { error: J, request: G, response: void 0 };
        }
        for (const W of f.response.fns) W && (D = await W(D, G, b));
        const k = { request: G, response: D };
        if (D.ok) {
          const W =
            (b.parseAs === 'auto'
              ? TS(D.headers.get('Content-Type'))
              : b.parseAs) ?? 'json';
          if (D.status === 204 || D.headers.get('Content-Length') === '0') {
            let Z;
            switch (W) {
              case 'arrayBuffer':
              case 'blob':
              case 'text':
                Z = await D[W]();
                break;
              case 'formData':
                Z = new FormData();
                break;
              case 'stream':
                Z = D.body;
                break;
              case 'json':
              default:
                Z = {};
                break;
            }
            return b.responseStyle === 'data' ? Z : { data: Z, ...k };
          }
          let J;
          switch (W) {
            case 'arrayBuffer':
            case 'blob':
            case 'formData':
            case 'text':
              J = await D[W]();
              break;
            case 'json': {
              const Z = await D.text();
              J = Z ? JSON.parse(Z) : {};
              break;
            }
            case 'stream':
              return b.responseStyle === 'data'
                ? D.body
                : { data: D.body, ...k };
          }
          return (
            W === 'json' &&
              (b.responseValidator && (await b.responseValidator(J)),
              b.responseTransformer && (J = await b.responseTransformer(J))),
            b.responseStyle === 'data' ? J : { data: J, ...k }
          );
        }
        const te = await D.text();
        let F;
        try {
          F = JSON.parse(te);
        } catch {}
        const I = F ?? te;
        let ne = I;
        for (const W of f.error.fns) W && (ne = await W(I, D, G, b));
        if (((ne = ne || {}), b.throwOnError)) throw ne;
        return b.responseStyle === 'data' ? void 0 : { error: ne, ...k };
      },
      x = (S) => (b) => m({ ...b, method: S }),
      p = (S) => async (b) => {
        const { opts: _, url: V } = await d(b);
        return yS({
          ..._,
          body: _.body,
          headers: _.headers,
          method: S,
          onRequest: async (G, B) => {
            let D = new Request(G, B);
            for (const k of f.request.fns) k && (D = await k(D, _));
            return D;
          },
          serializedBody: Gm(_),
          url: V,
        });
      };
    return {
      buildUrl: (S) => Xm({ ...r, ...S }),
      connect: x('CONNECT'),
      delete: x('DELETE'),
      get: x('GET'),
      getConfig: u,
      head: x('HEAD'),
      interceptors: f,
      options: x('OPTIONS'),
      patch: x('PATCH'),
      post: x('POST'),
      put: x('PUT'),
      request: m,
      setConfig: c,
      sse: {
        connect: p('CONNECT'),
        delete: p('DELETE'),
        get: p('GET'),
        head: p('HEAD'),
        options: p('OPTIONS'),
        patch: p('PATCH'),
        post: p('POST'),
        put: p('PUT'),
        trace: p('TRACE'),
      },
      trace: x('TRACE'),
    };
  },
  at = ep(Py({ baseUrl: 'http://localhost:7777' })),
  _S = (l) =>
    ((l == null ? void 0 : l.client) ?? at).get({ url: '/admin/setup', ...l }),
  OS = (l) =>
    (l.client ?? at).put({
      url: '/admin/setup',
      ...l,
      headers: { 'Content-Type': 'application/json', ...l.headers },
    }),
  CS = (l) =>
    (l.client ?? at).post({
      url: '/email/start',
      ...l,
      headers: { 'Content-Type': 'application/json', ...l.headers },
    }),
  MS = (l) =>
    (l.client ?? at).post({
      url: '/email/verify',
      ...l,
      headers: { 'Content-Type': 'application/json', ...l.headers },
    }),
  DS = (l) =>
    ((l == null ? void 0 : l.client) ?? at).get({
      security: [{ scheme: 'bearer', type: 'http' }],
      url: '/me',
      ...l,
    }),
  US = (l) =>
    (l.client ?? at).post({
      url: '/session/refresh',
      ...l,
      headers: { 'Content-Type': 'application/json', ...l.headers },
    }),
  kS = (l) =>
    ((l == null ? void 0 : l.client) ?? at).post({
      security: [{ scheme: 'bearer', type: 'http' }],
      url: '/session/logout',
      ...l,
    }),
  HS = (l) =>
    (l.client ?? at).post({
      security: [{ scheme: 'bearer', type: 'http' }],
      url: '/session/{session_id}/logout',
      ...l,
    }),
  BS = (l) =>
    (l.client ?? at).post({
      url: '/ed25519/start',
      ...l,
      headers: { 'Content-Type': 'application/json', ...l.headers },
    }),
  qS = (l) =>
    (l.client ?? at).post({
      url: '/ed25519/verify',
      ...l,
      headers: { 'Content-Type': 'application/json', ...l.headers },
    }),
  LS = (l) =>
    ((l == null ? void 0 : l.client) ?? at).get({
      security: [{ scheme: 'bearer', type: 'http' }],
      url: '/ed25519/credentials',
      ...l,
    }),
  YS = (l) =>
    (l.client ?? at).post({
      security: [{ scheme: 'bearer', type: 'http' }],
      url: '/ed25519/credentials',
      ...l,
      headers: { 'Content-Type': 'application/json', ...l.headers },
    }),
  GS = (l) =>
    (l.client ?? at).delete({
      security: [{ scheme: 'bearer', type: 'http' }],
      url: '/ed25519/credentials/{id}',
      ...l,
    }),
  XS = (l) =>
    (l.client ?? at).patch({
      security: [{ scheme: 'bearer', type: 'http' }],
      url: '/ed25519/credentials/{id}',
      ...l,
      headers: { 'Content-Type': 'application/json', ...l.headers },
    }),
  ZS = (l) =>
    (l.client ?? at).post({
      security: [{ scheme: 'bearer', type: 'http' }],
      url: '/webauthn/register/options',
      ...l,
      headers: { 'Content-Type': 'application/json', ...l.headers },
    }),
  QS = (l) =>
    (l.client ?? at).post({
      security: [{ scheme: 'bearer', type: 'http' }],
      url: '/webauthn/register/verify',
      ...l,
      headers: { 'Content-Type': 'application/json', ...l.headers },
    }),
  VS = (l) =>
    (l.client ?? at).post({
      url: '/webauthn/authenticate/options',
      ...l,
      headers: { 'Content-Type': 'application/json', ...l.headers },
    }),
  KS = (l) =>
    (l.client ?? at).post({
      url: '/webauthn/authenticate/verify',
      ...l,
      headers: { 'Content-Type': 'application/json', ...l.headers },
    }),
  JS = (l) =>
    (l.client ?? at).delete({
      security: [{ scheme: 'bearer', type: 'http' }],
      url: '/webauthn/credentials/{id}',
      ...l,
    }),
  $S = (l) =>
    ((l == null ? void 0 : l.client) ?? at).get({ url: '/jwks', ...l });
function WS(l, r) {
  const u = new Error(`${l}: ${r}`);
  return ((u.name = 'AuthMiniSdkError'), (u.code = l), u);
}
function FS(l) {
  if (!l.baseUrl) throw WS('sdk_init_failed', 'Missing API base URL');
  const r = ep({ auth: l.auth, baseUrl: l.baseUrl, fetch: l.fetch });
  return {
    admin: {
      setup: {
        get: (u) => _S({ ...(u ?? {}), client: r }),
        update: (u) => OS({ ...u, client: r }),
      },
    },
    email: {
      start: (u) => CS({ ...u, client: r }),
      verify: (u) => MS({ ...u, client: r }),
    },
    me: { get: (u) => DS({ ...(u ?? {}), client: r }) },
    session: {
      refresh: (u) => US({ ...u, client: r }),
      logoutCurrent: (u) => kS({ ...(u ?? {}), client: r }),
      logoutPeer: (u) => HS({ ...u, client: r }),
    },
    ed25519: {
      startAuthentication: (u) => BS({ ...u, client: r }),
      verifyAuthentication: (u) => qS({ ...u, client: r }),
      listCredentials: (u) => LS({ ...(u ?? {}), client: r }),
      createCredential: (u) => YS({ ...u, client: r }),
      deleteCredential: (u) => GS({ ...u, client: r }),
      updateCredential: (u) => XS({ ...u, client: r }),
    },
    webauthn: {
      createRegistrationOptions: (u) => ZS({ ...u, client: r }),
      verifyRegistration: (u) => QS({ ...u, client: r }),
      createAuthenticationOptions: (u) => VS({ ...u, client: r }),
      verifyAuthentication: (u) => KS({ ...u, client: r }),
      deleteCredential: (u) => JS({ ...u, client: r }),
    },
    jwks: { list: (u) => $S({ ...(u ?? {}), client: r }) },
  };
}
function Qm(l, r) {
  if (typeof l == 'function') return l(r);
  l != null && (l.current = r);
}
function IS(...l) {
  return (r) => {
    let u = !1;
    const c = l.map((f) => {
      const d = Qm(f, r);
      return (!u && typeof d == 'function' && (u = !0), d);
    });
    if (u)
      return () => {
        for (let f = 0; f < c.length; f++) {
          const d = c[f];
          typeof d == 'function' ? d() : Qm(l[f], null);
        }
      };
  };
}
var PS = Symbol.for('react.lazy'),
  ar = Cb[' use '.trim().toString()];
function e1(l) {
  return typeof l == 'object' && l !== null && 'then' in l;
}
function tp(l) {
  return (
    l != null &&
    typeof l == 'object' &&
    '$$typeof' in l &&
    l.$$typeof === PS &&
    '_payload' in l &&
    e1(l._payload)
  );
}
function t1(l) {
  const r = a1(l),
    u = E.forwardRef((c, f) => {
      let { children: d, ...m } = c;
      tp(d) && typeof ar == 'function' && (d = ar(d._payload));
      const x = E.Children.toArray(d),
        p = x.find(l1);
      if (p) {
        const v = p.props.children,
          S = x.map((b) =>
            b === p
              ? E.Children.count(v) > 1
                ? E.Children.only(null)
                : E.isValidElement(v)
                  ? v.props.children
                  : null
              : b,
          );
        return h.jsx(r, {
          ...m,
          ref: f,
          children: E.isValidElement(v) ? E.cloneElement(v, void 0, S) : null,
        });
      }
      return h.jsx(r, { ...m, ref: f, children: d });
    });
  return ((u.displayName = `${l}.Slot`), u);
}
function a1(l) {
  const r = E.forwardRef((u, c) => {
    let { children: f, ...d } = u;
    if (
      (tp(f) && typeof ar == 'function' && (f = ar(f._payload)),
      E.isValidElement(f))
    ) {
      const m = s1(f),
        x = i1(d, f.props);
      return (
        f.type !== E.Fragment && (x.ref = c ? IS(c, m) : m),
        E.cloneElement(f, x)
      );
    }
    return E.Children.count(f) > 1 ? E.Children.only(null) : null;
  });
  return ((r.displayName = `${l}.SlotClone`), r);
}
var n1 = Symbol('radix.slottable');
function l1(l) {
  return (
    E.isValidElement(l) &&
    typeof l.type == 'function' &&
    '__radixId' in l.type &&
    l.type.__radixId === n1
  );
}
function i1(l, r) {
  const u = { ...r };
  for (const c in r) {
    const f = l[c],
      d = r[c];
    /^on[A-Z]/.test(c)
      ? f && d
        ? (u[c] = (...x) => {
            const p = d(...x);
            return (f(...x), p);
          })
        : f && (u[c] = f)
      : c === 'style'
        ? (u[c] = { ...f, ...d })
        : c === 'className' && (u[c] = [f, d].filter(Boolean).join(' '));
  }
  return { ...l, ...u };
}
function s1(l) {
  var c, f;
  let r =
      (c = Object.getOwnPropertyDescriptor(l.props, 'ref')) == null
        ? void 0
        : c.get,
    u = r && 'isReactWarning' in r && r.isReactWarning;
  return u
    ? l.ref
    : ((r =
        (f = Object.getOwnPropertyDescriptor(l, 'ref')) == null
          ? void 0
          : f.get),
      (u = r && 'isReactWarning' in r && r.isReactWarning),
      u ? l.props.ref : l.props.ref || l.ref);
}
var r1 = [
    'a',
    'button',
    'div',
    'form',
    'h2',
    'h3',
    'img',
    'input',
    'label',
    'li',
    'nav',
    'ol',
    'p',
    'select',
    'span',
    'svg',
    'ul',
  ],
  u1 = r1.reduce((l, r) => {
    const u = t1(`Primitive.${r}`),
      c = E.forwardRef((f, d) => {
        const { asChild: m, ...x } = f,
          p = m ? u : r;
        return (
          typeof window < 'u' && (window[Symbol.for('radix-ui')] = !0),
          h.jsx(p, { ...x, ref: d })
        );
      });
    return ((c.displayName = `Primitive.${r}`), { ...l, [r]: c });
  }, {}),
  c1 = 'Separator',
  Vm = 'horizontal',
  o1 = ['horizontal', 'vertical'],
  ap = E.forwardRef((l, r) => {
    const { decorative: u, orientation: c = Vm, ...f } = l,
      d = f1(c) ? c : Vm,
      x = u
        ? { role: 'none' }
        : {
            'aria-orientation': d === 'vertical' ? d : void 0,
            role: 'separator',
          };
    return h.jsx(u1.div, { 'data-orientation': d, ...x, ...f, ref: r });
  });
ap.displayName = c1;
function f1(l) {
  return o1.includes(l);
}
var np = ap;
const Gc = E.forwardRef(
  (
    { className: l, orientation: r = 'horizontal', decorative: u = !0, ...c },
    f,
  ) =>
    h.jsx(np, {
      ref: f,
      decorative: u,
      orientation: r,
      className: Dt(
        'shrink-0 bg-slate-200',
        r === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
        l,
      ),
      ...c,
    }),
);
Gc.displayName = np.displayName;
const Km = 587;
function Jm(l) {
  return typeof l == 'object' && l !== null && 'error' in l
    ? String(l.error)
    : 'setup_failed';
}
function d1() {
  const l = oy(),
    { config: r, setAuthOrigin: u } = ln(),
    [c, f] = E.useState(r.authOrigin),
    [d, m] = E.useState(r.authOrigin),
    [x, p] = E.useState(r.pageOrigin),
    [v, S] = E.useState('Admin key'),
    [b, _] = E.useState(''),
    [V, G] = E.useState(''),
    [B, D] = E.useState(''),
    [k, te] = E.useState(Km),
    [F, I] = E.useState(''),
    [ne, W] = E.useState(''),
    [J, Z] = E.useState(''),
    [ye, Ye] = E.useState('Auth Mini'),
    [Re, Ee] = E.useState(!1),
    [De, Be] = E.useState(1),
    [ae, z] = E.useState('idle'),
    [q, le] = E.useState(''),
    [ce, $] = E.useState(null);
  E.useEffect(() => {
    (f(r.authOrigin), m(r.authOrigin));
  }, [r.authOrigin]);
  function w(N) {
    N.preventDefault();
    const Q = c.trim();
    (u(Q),
      l({
        pathname: '/setup',
        search: Q ? `?auth-origin=${encodeURIComponent(Q)}` : '',
      }));
  }
  async function g(N) {
    (N.preventDefault(), z('saving'), le(''));
    try {
      const Q = FS({ baseUrl: r.authOrigin }),
        K =
          B.trim() === ''
            ? void 0
            : {
                host: B,
                port: k,
                username: F,
                password: ne,
                from_email: J,
                from_name: ye,
                secure: Re,
                weight: De,
              },
        P = b.trim() === '' ? void 0 : { name: v.trim(), public_key: b.trim() },
        fe = await Q.admin.setup.update({
          body: { issuer: d, origin: x, admin_ed25519: P, smtp: K },
          throwOnError: !0,
        });
      if (!fe.data) throw new Error('setup_failed');
      ($(fe.data), z('saved'), le('Setup saved'));
    } catch (Q) {
      (z('failed'), le(Jm(Q)));
    }
  }
  async function A() {
    (z('saving'), le(''));
    try {
      const N = await Jy();
      (_(N.publicKey), G(N.seed), le('Admin key generated'));
    } catch (N) {
      (z('failed'), le(Jm(N)));
      return;
    }
    z('idle');
  }
  return h.jsx(vl, {
    title: 'Setup',
    description: 'Configure a self-hosted auth-mini instance for this demo.',
    children: h.jsxs('div', {
      className: 'space-y-8',
      children: [
        h.jsxs('form', {
          className: 'space-y-4',
          onSubmit: w,
          children: [
            h.jsxs('label', {
              className: 'grid gap-2 text-sm font-medium text-slate-700',
              children: [
                h.jsx('span', { children: 'Auth server origin' }),
                h.jsx(it, {
                  'aria-label': 'Auth server origin',
                  value: c,
                  onChange: (N) => {
                    f(N.currentTarget.value);
                  },
                  placeholder: 'https://auth.example.com',
                }),
              ],
            }),
            h.jsxs('div', {
              className: 'flex flex-wrap items-center gap-3',
              children: [
                h.jsx(mt, { type: 'submit', children: 'Save origin' }),
                h.jsx('span', {
                  className: 'text-sm text-slate-500',
                  children: r.authOrigin,
                }),
              ],
            }),
          ],
        }),
        h.jsx(Gc, {}),
        h.jsxs('form', {
          className: 'space-y-5',
          onSubmit: g,
          children: [
            h.jsxs('div', {
              className: 'grid gap-4 md:grid-cols-2',
              children: [
                h.jsxs('label', {
                  className:
                    'grid gap-2 text-sm font-medium text-slate-700 md:col-span-2',
                  children: [
                    h.jsx('span', { children: 'Issuer' }),
                    h.jsx(it, {
                      'aria-label': 'Issuer',
                      value: d,
                      onChange: (N) => {
                        m(N.currentTarget.value);
                      },
                      required: !0,
                    }),
                  ],
                }),
                h.jsxs('label', {
                  className:
                    'grid gap-2 text-sm font-medium text-slate-700 md:col-span-2',
                  children: [
                    h.jsx('span', { children: 'Allowed page origin' }),
                    h.jsx(it, {
                      'aria-label': 'Allowed page origin',
                      value: x,
                      onChange: (N) => {
                        p(N.currentTarget.value);
                      },
                      required: !0,
                    }),
                  ],
                }),
                h.jsxs('label', {
                  className: 'grid gap-2 text-sm font-medium text-slate-700',
                  children: [
                    h.jsx('span', { children: 'Admin key name' }),
                    h.jsx(it, {
                      'aria-label': 'Admin key name',
                      value: v,
                      onChange: (N) => {
                        S(N.currentTarget.value);
                      },
                    }),
                  ],
                }),
                h.jsxs('label', {
                  className: 'grid gap-2 text-sm font-medium text-slate-700',
                  children: [
                    h.jsx('span', { children: 'Admin Ed25519 public key' }),
                    h.jsx(it, {
                      'aria-label': 'Admin Ed25519 public key',
                      value: b,
                      onChange: (N) => {
                        _(N.currentTarget.value);
                      },
                    }),
                  ],
                }),
                h.jsxs('label', {
                  className: 'grid gap-2 text-sm font-medium text-slate-700',
                  children: [
                    h.jsx('span', { children: 'SMTP host' }),
                    h.jsx(it, {
                      'aria-label': 'SMTP host',
                      value: B,
                      onChange: (N) => {
                        D(N.currentTarget.value);
                      },
                      placeholder: 'smtp.example.com',
                    }),
                  ],
                }),
                h.jsxs('label', {
                  className: 'grid gap-2 text-sm font-medium text-slate-700',
                  children: [
                    h.jsx('span', { children: 'SMTP port' }),
                    h.jsx(it, {
                      'aria-label': 'SMTP port',
                      min: 1,
                      type: 'number',
                      value: k,
                      onChange: (N) => {
                        te(N.currentTarget.valueAsNumber || Km);
                      },
                    }),
                  ],
                }),
                h.jsxs('label', {
                  className: 'grid gap-2 text-sm font-medium text-slate-700',
                  children: [
                    h.jsx('span', { children: 'SMTP username' }),
                    h.jsx(it, {
                      'aria-label': 'SMTP username',
                      value: F,
                      onChange: (N) => {
                        I(N.currentTarget.value);
                      },
                    }),
                  ],
                }),
                h.jsxs('label', {
                  className: 'grid gap-2 text-sm font-medium text-slate-700',
                  children: [
                    h.jsx('span', { children: 'SMTP password' }),
                    h.jsx(it, {
                      'aria-label': 'SMTP password',
                      type: 'password',
                      value: ne,
                      onChange: (N) => {
                        W(N.currentTarget.value);
                      },
                    }),
                  ],
                }),
                h.jsxs('label', {
                  className: 'grid gap-2 text-sm font-medium text-slate-700',
                  children: [
                    h.jsx('span', { children: 'From email' }),
                    h.jsx(it, {
                      'aria-label': 'From email',
                      type: 'email',
                      value: J,
                      onChange: (N) => {
                        Z(N.currentTarget.value);
                      },
                      placeholder: 'noreply@example.com',
                    }),
                  ],
                }),
                h.jsxs('label', {
                  className: 'grid gap-2 text-sm font-medium text-slate-700',
                  children: [
                    h.jsx('span', { children: 'From name' }),
                    h.jsx(it, {
                      'aria-label': 'From name',
                      value: ye,
                      onChange: (N) => {
                        Ye(N.currentTarget.value);
                      },
                    }),
                  ],
                }),
                h.jsxs('label', {
                  className: 'grid gap-2 text-sm font-medium text-slate-700',
                  children: [
                    h.jsx('span', { children: 'SMTP weight' }),
                    h.jsx(it, {
                      'aria-label': 'SMTP weight',
                      min: 1,
                      type: 'number',
                      value: De,
                      onChange: (N) => {
                        Be(N.currentTarget.valueAsNumber || 1);
                      },
                    }),
                  ],
                }),
                h.jsxs('label', {
                  className:
                    'flex items-center gap-3 text-sm font-medium text-slate-700',
                  children: [
                    h.jsx('input', {
                      checked: Re,
                      className: 'h-4 w-4 rounded border-slate-300',
                      onChange: (N) => {
                        Ee(N.currentTarget.checked);
                      },
                      type: 'checkbox',
                    }),
                    h.jsx('span', { children: 'Use TLS' }),
                  ],
                }),
              ],
            }),
            h.jsxs('div', {
              className: 'flex flex-wrap items-center gap-3',
              children: [
                h.jsx(mt, {
                  disabled: ae === 'saving',
                  onClick: () => {
                    A();
                  },
                  type: 'button',
                  children: 'Generate admin key',
                }),
                h.jsx(mt, {
                  disabled: ae === 'saving',
                  type: 'submit',
                  children: ae === 'saving' ? 'Saving...' : 'Save setup',
                }),
                q
                  ? h.jsx('span', {
                      className: 'text-sm text-slate-500',
                      role: 'status',
                      children: q,
                    })
                  : null,
              ],
            }),
          ],
        }),
        ce
          ? h.jsxs('section', {
              className: 'space-y-3 text-sm text-slate-600',
              children: [
                h.jsxs('div', {
                  className: 'space-y-1',
                  children: [
                    h.jsx('strong', {
                      className: 'block text-slate-950',
                      children: 'Issuer',
                    }),
                    h.jsx('div', { children: ce.issuer }),
                  ],
                }),
                h.jsxs('div', {
                  className: 'space-y-1',
                  children: [
                    h.jsx('strong', {
                      className: 'block text-slate-950',
                      children: 'Admin',
                    }),
                    h.jsx('div', {
                      children: ce.admin_ed25519
                        ? ce.admin_ed25519.name
                        : 'Not configured',
                    }),
                  ],
                }),
                V
                  ? h.jsxs('div', {
                      className: 'space-y-1',
                      children: [
                        h.jsx('strong', {
                          className: 'block text-slate-950',
                          children: 'Generated admin seed',
                        }),
                        h.jsx('div', { className: 'break-all', children: V }),
                      ],
                    })
                  : null,
                h.jsxs('div', {
                  className: 'space-y-1',
                  children: [
                    h.jsx('strong', {
                      className: 'block text-slate-950',
                      children: 'Allowed origins',
                    }),
                    h.jsx('div', {
                      children: ce.origins.map((N) => N.origin).join(', '),
                    }),
                  ],
                }),
                h.jsxs('div', {
                  className: 'space-y-1',
                  children: [
                    h.jsx('strong', {
                      className: 'block text-slate-950',
                      children: 'SMTP',
                    }),
                    h.jsx('div', {
                      children: ce.smtp ? ce.smtp.host : 'Not configured',
                    }),
                  ],
                }),
              ],
            })
          : null,
        h.jsx(Gc, {}),
        h.jsxs('section', {
          className: 'space-y-3 text-sm text-slate-600',
          children: [
            h.jsxs('div', {
              className: 'space-y-1',
              children: [
                h.jsx('strong', {
                  className: 'block text-slate-950',
                  children: 'Server',
                }),
                h.jsx('div', {
                  children:
                    'auth-mini --host 127.0.0.1 --port 7777 --db ./auth-mini.sqlite',
                }),
              ],
            }),
            h.jsxs('div', {
              className: 'space-y-1',
              children: [
                h.jsx('strong', {
                  className: 'block text-slate-950',
                  children: 'Page origin',
                }),
                h.jsx('div', { children: r.pageOrigin }),
              ],
            }),
          ],
        }),
      ],
    }),
  });
}
function h1() {
  return h.jsx(jx, {
    children: h.jsx(q0, {
      children: h.jsxs(ja, {
        element: h.jsx(zx, {}),
        children: [
          h.jsx(ja, { path: '/', element: h.jsx(sS, {}) }),
          h.jsx(ja, { path: '/setup', element: h.jsx(d1, {}) }),
          h.jsx(ja, { path: '/email', element: h.jsx(Ux, {}) }),
          h.jsx(ja, { path: '/ed25519', element: h.jsx(tS, {}) }),
          h.jsx(ja, { path: '/passkey', element: h.jsx(rS, {}) }),
          h.jsx(ja, { path: '/credentials', element: h.jsx(Dx, {}) }),
          h.jsx(ja, { path: '/session', element: h.jsx(hS, {}) }),
        ],
      }),
    }),
  });
}
qb.createRoot(document.getElementById('root')).render(
  h.jsx(Wm.StrictMode, { children: h.jsx(cv, { children: h.jsx(h1, {}) }) }),
);
