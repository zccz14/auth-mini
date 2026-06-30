var Ab = Object.defineProperty;
var wb = (n, r, u) =>
  r in n
    ? Ab(n, r, { enumerable: !0, configurable: !0, writable: !0, value: u })
    : (n[r] = u);
var el = (n, r, u) => wb(n, typeof r != 'symbol' ? r + '' : r, u);
function jb(n, r) {
  for (var u = 0; u < r.length; u++) {
    const c = r[u];
    if (typeof c != 'string' && !Array.isArray(c)) {
      for (const f in c)
        if (f !== 'default' && !(f in n)) {
          const d = Object.getOwnPropertyDescriptor(c, f);
          d &&
            Object.defineProperty(
              n,
              f,
              d.get ? d : { enumerable: !0, get: () => c[f] },
            );
        }
    }
  }
  return Object.freeze(
    Object.defineProperty(n, Symbol.toStringTag, { value: 'Module' }),
  );
}
(function () {
  const r = document.createElement('link').relList;
  if (r && r.supports && r.supports('modulepreload')) return;
  for (const f of document.querySelectorAll('link[rel="modulepreload"]')) c(f);
  new MutationObserver((f) => {
    for (const d of f)
      if (d.type === 'childList')
        for (const h of d.addedNodes)
          h.tagName === 'LINK' && h.rel === 'modulepreload' && c(h);
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
function Kh(n) {
  return n && n.__esModule && Object.prototype.hasOwnProperty.call(n, 'default')
    ? n.default
    : n;
}
var xc = { exports: {} },
  mi = {};
/**
 * @license React
 * react-jsx-runtime.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */ var ah;
function Nb() {
  if (ah) return mi;
  ah = 1;
  var n = Symbol.for('react.transitional.element'),
    r = Symbol.for('react.fragment');
  function u(c, f, d) {
    var h = null;
    if (
      (d !== void 0 && (h = '' + d),
      f.key !== void 0 && (h = '' + f.key),
      'key' in f)
    ) {
      d = {};
      for (var v in f) v !== 'key' && (d[v] = f[v]);
    } else d = f;
    return (
      (f = d.ref),
      { $$typeof: n, type: c, key: h, ref: f !== void 0 ? f : null, props: d }
    );
  }
  return ((mi.Fragment = r), (mi.jsx = u), (mi.jsxs = u), mi);
}
var lh;
function Rb() {
  return (lh || ((lh = 1), (xc.exports = Nb())), xc.exports);
}
var m = Rb(),
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
 */ var nh;
function zb() {
  if (nh) return ge;
  nh = 1;
  var n = Symbol.for('react.transitional.element'),
    r = Symbol.for('react.portal'),
    u = Symbol.for('react.fragment'),
    c = Symbol.for('react.strict_mode'),
    f = Symbol.for('react.profiler'),
    d = Symbol.for('react.consumer'),
    h = Symbol.for('react.context'),
    v = Symbol.for('react.forward_ref'),
    p = Symbol.for('react.suspense'),
    b = Symbol.for('react.memo'),
    S = Symbol.for('react.lazy'),
    x = Symbol.for('react.activity'),
    C = Symbol.iterator;
  function Z(w) {
    return w === null || typeof w != 'object'
      ? null
      : ((w = (C && w[C]) || w['@@iterator']),
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
    V = Object.assign,
    U = {};
  function B(w, g, T) {
    ((this.props = w),
      (this.context = g),
      (this.refs = U),
      (this.updater = T || G));
  }
  ((B.prototype.isReactComponent = {}),
    (B.prototype.setState = function (w, g) {
      if (typeof w != 'object' && typeof w != 'function' && w != null)
        throw Error(
          'takes an object of state variables to update or a function which returns an object of state variables.',
        );
      this.updater.enqueueSetState(this, w, g, 'setState');
    }),
    (B.prototype.forceUpdate = function (w) {
      this.updater.enqueueForceUpdate(this, w, 'forceUpdate');
    }));
  function ne() {}
  ne.prototype = B.prototype;
  function ae(w, g, T) {
    ((this.props = w),
      (this.context = g),
      (this.refs = U),
      (this.updater = T || G));
  }
  var te = (ae.prototype = new ne());
  ((te.constructor = ae), V(te, B.prototype), (te.isPureReactComponent = !0));
  var le = Array.isArray;
  function W() {}
  var $ = { H: null, A: null, T: null, S: null },
    X = Object.prototype.hasOwnProperty;
  function ye(w, g, T) {
    var M = T.ref;
    return {
      $$typeof: n,
      type: w,
      key: g,
      ref: M !== void 0 ? M : null,
      props: T,
    };
  }
  function Ye(w, g) {
    return ye(w.type, g, w.props);
  }
  function Re(w) {
    return typeof w == 'object' && w !== null && w.$$typeof === n;
  }
  function be(w) {
    var g = { '=': '=0', ':': '=2' };
    return (
      '$' +
      w.replace(/[=:]/g, function (T) {
        return g[T];
      })
    );
  }
  var Ue = /\/+/g;
  function ze(w, g) {
    return typeof w == 'object' && w !== null && w.key != null
      ? be('' + w.key)
      : g.toString(36);
  }
  function P(w) {
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
  function R(w, g, T, M, Q) {
    var K = typeof w;
    (K === 'undefined' || K === 'boolean') && (w = null);
    var I = !1;
    if (w === null) I = !0;
    else
      switch (K) {
        case 'bigint':
        case 'string':
        case 'number':
          I = !0;
          break;
        case 'object':
          switch (w.$$typeof) {
            case n:
            case r:
              I = !0;
              break;
            case S:
              return ((I = w._init), R(I(w._payload), g, T, M, Q));
          }
      }
    if (I)
      return (
        (Q = Q(w)),
        (I = M === '' ? '.' + ze(w, 0) : M),
        le(Q)
          ? ((T = ''),
            I != null && (T = I.replace(Ue, '$&/') + '/'),
            R(Q, g, T, '', function (F) {
              return F;
            }))
          : Q != null &&
            (Re(Q) &&
              (Q = Ye(
                Q,
                T +
                  (Q.key == null || (w && w.key === Q.key)
                    ? ''
                    : ('' + Q.key).replace(Ue, '$&/') + '/') +
                  I,
              )),
            g.push(Q)),
        1
      );
    I = 0;
    var fe = M === '' ? '.' : M + ':';
    if (le(w))
      for (var L = 0; L < w.length; L++)
        ((M = w[L]), (K = fe + ze(M, L)), (I += R(M, g, T, K, Q)));
    else if (((L = Z(w)), typeof L == 'function'))
      for (w = L.call(w), L = 0; !(M = w.next()).done; )
        ((M = M.value), (K = fe + ze(M, L++)), (I += R(M, g, T, K, Q)));
    else if (K === 'object') {
      if (typeof w.then == 'function') return R(P(w), g, T, M, Q);
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
    return I;
  }
  function q(w, g, T) {
    if (w == null) return w;
    var M = [],
      Q = 0;
    return (
      R(w, M, '', '', function (K) {
        return g.call(T, K, Q++);
      }),
      M
    );
  }
  function se(w) {
    if (w._status === -1) {
      var g = w._result;
      ((g = g()),
        g.then(
          function (T) {
            (w._status === 0 || w._status === -1) &&
              ((w._status = 1), (w._result = T));
          },
          function (T) {
            (w._status === 0 || w._status === -1) &&
              ((w._status = 2), (w._result = T));
          },
        ),
        w._status === -1 && ((w._status = 0), (w._result = g)));
    }
    if (w._status === 1) return w._result.default;
    throw w._result;
  }
  var ee =
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
    J = {
      map: q,
      forEach: function (w, g, T) {
        q(
          w,
          function () {
            g.apply(this, arguments);
          },
          T,
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
    (ge.Activity = x),
    (ge.Children = J),
    (ge.Component = B),
    (ge.Fragment = u),
    (ge.Profiler = f),
    (ge.PureComponent = ae),
    (ge.StrictMode = c),
    (ge.Suspense = p),
    (ge.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = $),
    (ge.__COMPILER_RUNTIME = {
      __proto__: null,
      c: function (w) {
        return $.H.useMemoCache(w);
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
    (ge.cloneElement = function (w, g, T) {
      if (w == null)
        throw Error(
          'The argument must be a React element, but you passed ' + w + '.',
        );
      var M = V({}, w.props),
        Q = w.key;
      if (g != null)
        for (K in (g.key !== void 0 && (Q = '' + g.key), g))
          !X.call(g, K) ||
            K === 'key' ||
            K === '__self' ||
            K === '__source' ||
            (K === 'ref' && g.ref === void 0) ||
            (M[K] = g[K]);
      var K = arguments.length - 2;
      if (K === 1) M.children = T;
      else if (1 < K) {
        for (var I = Array(K), fe = 0; fe < K; fe++) I[fe] = arguments[fe + 2];
        M.children = I;
      }
      return ye(w.type, Q, M);
    }),
    (ge.createContext = function (w) {
      return (
        (w = {
          $$typeof: h,
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
    (ge.createElement = function (w, g, T) {
      var M,
        Q = {},
        K = null;
      if (g != null)
        for (M in (g.key !== void 0 && (K = '' + g.key), g))
          X.call(g, M) &&
            M !== 'key' &&
            M !== '__self' &&
            M !== '__source' &&
            (Q[M] = g[M]);
      var I = arguments.length - 2;
      if (I === 1) Q.children = T;
      else if (1 < I) {
        for (var fe = Array(I), L = 0; L < I; L++) fe[L] = arguments[L + 2];
        Q.children = fe;
      }
      if (w && w.defaultProps)
        for (M in ((I = w.defaultProps), I)) Q[M] === void 0 && (Q[M] = I[M]);
      return ye(w, K, Q);
    }),
    (ge.createRef = function () {
      return { current: null };
    }),
    (ge.forwardRef = function (w) {
      return { $$typeof: v, render: w };
    }),
    (ge.isValidElement = Re),
    (ge.lazy = function (w) {
      return { $$typeof: S, _payload: { _status: -1, _result: w }, _init: se };
    }),
    (ge.memo = function (w, g) {
      return { $$typeof: b, type: w, compare: g === void 0 ? null : g };
    }),
    (ge.startTransition = function (w) {
      var g = $.T,
        T = {};
      $.T = T;
      try {
        var M = w(),
          Q = $.S;
        (Q !== null && Q(T, M),
          typeof M == 'object' &&
            M !== null &&
            typeof M.then == 'function' &&
            M.then(W, ee));
      } catch (K) {
        ee(K);
      } finally {
        (g !== null && T.types !== null && (g.types = T.types), ($.T = g));
      }
    }),
    (ge.unstable_useCacheRefresh = function () {
      return $.H.useCacheRefresh();
    }),
    (ge.use = function (w) {
      return $.H.use(w);
    }),
    (ge.useActionState = function (w, g, T) {
      return $.H.useActionState(w, g, T);
    }),
    (ge.useCallback = function (w, g) {
      return $.H.useCallback(w, g);
    }),
    (ge.useContext = function (w) {
      return $.H.useContext(w);
    }),
    (ge.useDebugValue = function () {}),
    (ge.useDeferredValue = function (w, g) {
      return $.H.useDeferredValue(w, g);
    }),
    (ge.useEffect = function (w, g) {
      return $.H.useEffect(w, g);
    }),
    (ge.useEffectEvent = function (w) {
      return $.H.useEffectEvent(w);
    }),
    (ge.useId = function () {
      return $.H.useId();
    }),
    (ge.useImperativeHandle = function (w, g, T) {
      return $.H.useImperativeHandle(w, g, T);
    }),
    (ge.useInsertionEffect = function (w, g) {
      return $.H.useInsertionEffect(w, g);
    }),
    (ge.useLayoutEffect = function (w, g) {
      return $.H.useLayoutEffect(w, g);
    }),
    (ge.useMemo = function (w, g) {
      return $.H.useMemo(w, g);
    }),
    (ge.useOptimistic = function (w, g) {
      return $.H.useOptimistic(w, g);
    }),
    (ge.useReducer = function (w, g, T) {
      return $.H.useReducer(w, g, T);
    }),
    (ge.useRef = function (w) {
      return $.H.useRef(w);
    }),
    (ge.useState = function (w) {
      return $.H.useState(w);
    }),
    (ge.useSyncExternalStore = function (w, g, T) {
      return $.H.useSyncExternalStore(w, g, T);
    }),
    (ge.useTransition = function () {
      return $.H.useTransition();
    }),
    (ge.version = '19.2.5'),
    ge
  );
}
var ih;
function Yc() {
  return (ih || ((ih = 1), (Sc.exports = zb())), Sc.exports);
}
var A = Yc();
const Jh = Kh(A),
  _b = jb({ __proto__: null, default: Jh }, [A]);
var Ec = { exports: {} },
  hi = {},
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
 */ var sh;
function Cb() {
  return (
    sh ||
      ((sh = 1),
      (function (n) {
        function r(R, q) {
          var se = R.length;
          R.push(q);
          e: for (; 0 < se; ) {
            var ee = (se - 1) >>> 1,
              J = R[ee];
            if (0 < f(J, q)) ((R[ee] = q), (R[se] = J), (se = ee));
            else break e;
          }
        }
        function u(R) {
          return R.length === 0 ? null : R[0];
        }
        function c(R) {
          if (R.length === 0) return null;
          var q = R[0],
            se = R.pop();
          if (se !== q) {
            R[0] = se;
            e: for (var ee = 0, J = R.length, w = J >>> 1; ee < w; ) {
              var g = 2 * (ee + 1) - 1,
                T = R[g],
                M = g + 1,
                Q = R[M];
              if (0 > f(T, se))
                M < J && 0 > f(Q, T)
                  ? ((R[ee] = Q), (R[M] = se), (ee = M))
                  : ((R[ee] = T), (R[g] = se), (ee = g));
              else if (M < J && 0 > f(Q, se))
                ((R[ee] = Q), (R[M] = se), (ee = M));
              else break e;
            }
          }
          return q;
        }
        function f(R, q) {
          var se = R.sortIndex - q.sortIndex;
          return se !== 0 ? se : R.id - q.id;
        }
        if (
          ((n.unstable_now = void 0),
          typeof performance == 'object' &&
            typeof performance.now == 'function')
        ) {
          var d = performance;
          n.unstable_now = function () {
            return d.now();
          };
        } else {
          var h = Date,
            v = h.now();
          n.unstable_now = function () {
            return h.now() - v;
          };
        }
        var p = [],
          b = [],
          S = 1,
          x = null,
          C = 3,
          Z = !1,
          G = !1,
          V = !1,
          U = !1,
          B = typeof setTimeout == 'function' ? setTimeout : null,
          ne = typeof clearTimeout == 'function' ? clearTimeout : null,
          ae = typeof setImmediate < 'u' ? setImmediate : null;
        function te(R) {
          for (var q = u(b); q !== null; ) {
            if (q.callback === null) c(b);
            else if (q.startTime <= R)
              (c(b), (q.sortIndex = q.expirationTime), r(p, q));
            else break;
            q = u(b);
          }
        }
        function le(R) {
          if (((V = !1), te(R), !G))
            if (u(p) !== null) ((G = !0), W || ((W = !0), be()));
            else {
              var q = u(b);
              q !== null && P(le, q.startTime - R);
            }
        }
        var W = !1,
          $ = -1,
          X = 5,
          ye = -1;
        function Ye() {
          return U ? !0 : !(n.unstable_now() - ye < X);
        }
        function Re() {
          if (((U = !1), W)) {
            var R = n.unstable_now();
            ye = R;
            var q = !0;
            try {
              e: {
                ((G = !1), V && ((V = !1), ne($), ($ = -1)), (Z = !0));
                var se = C;
                try {
                  t: {
                    for (
                      te(R), x = u(p);
                      x !== null && !(x.expirationTime > R && Ye());
                    ) {
                      var ee = x.callback;
                      if (typeof ee == 'function') {
                        ((x.callback = null), (C = x.priorityLevel));
                        var J = ee(x.expirationTime <= R);
                        if (((R = n.unstable_now()), typeof J == 'function')) {
                          ((x.callback = J), te(R), (q = !0));
                          break t;
                        }
                        (x === u(p) && c(p), te(R));
                      } else c(p);
                      x = u(p);
                    }
                    if (x !== null) q = !0;
                    else {
                      var w = u(b);
                      (w !== null && P(le, w.startTime - R), (q = !1));
                    }
                  }
                  break e;
                } finally {
                  ((x = null), (C = se), (Z = !1));
                }
                q = void 0;
              }
            } finally {
              q ? be() : (W = !1);
            }
          }
        }
        var be;
        if (typeof ae == 'function')
          be = function () {
            ae(Re);
          };
        else if (typeof MessageChannel < 'u') {
          var Ue = new MessageChannel(),
            ze = Ue.port2;
          ((Ue.port1.onmessage = Re),
            (be = function () {
              ze.postMessage(null);
            }));
        } else
          be = function () {
            B(Re, 0);
          };
        function P(R, q) {
          $ = B(function () {
            R(n.unstable_now());
          }, q);
        }
        ((n.unstable_IdlePriority = 5),
          (n.unstable_ImmediatePriority = 1),
          (n.unstable_LowPriority = 4),
          (n.unstable_NormalPriority = 3),
          (n.unstable_Profiling = null),
          (n.unstable_UserBlockingPriority = 2),
          (n.unstable_cancelCallback = function (R) {
            R.callback = null;
          }),
          (n.unstable_forceFrameRate = function (R) {
            0 > R || 125 < R
              ? console.error(
                  'forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported',
                )
              : (X = 0 < R ? Math.floor(1e3 / R) : 5);
          }),
          (n.unstable_getCurrentPriorityLevel = function () {
            return C;
          }),
          (n.unstable_next = function (R) {
            switch (C) {
              case 1:
              case 2:
              case 3:
                var q = 3;
                break;
              default:
                q = C;
            }
            var se = C;
            C = q;
            try {
              return R();
            } finally {
              C = se;
            }
          }),
          (n.unstable_requestPaint = function () {
            U = !0;
          }),
          (n.unstable_runWithPriority = function (R, q) {
            switch (R) {
              case 1:
              case 2:
              case 3:
              case 4:
              case 5:
                break;
              default:
                R = 3;
            }
            var se = C;
            C = R;
            try {
              return q();
            } finally {
              C = se;
            }
          }),
          (n.unstable_scheduleCallback = function (R, q, se) {
            var ee = n.unstable_now();
            switch (
              (typeof se == 'object' && se !== null
                ? ((se = se.delay),
                  (se = typeof se == 'number' && 0 < se ? ee + se : ee))
                : (se = ee),
              R)
            ) {
              case 1:
                var J = -1;
                break;
              case 2:
                J = 250;
                break;
              case 5:
                J = 1073741823;
                break;
              case 4:
                J = 1e4;
                break;
              default:
                J = 5e3;
            }
            return (
              (J = se + J),
              (R = {
                id: S++,
                callback: q,
                priorityLevel: R,
                startTime: se,
                expirationTime: J,
                sortIndex: -1,
              }),
              se > ee
                ? ((R.sortIndex = se),
                  r(b, R),
                  u(p) === null &&
                    R === u(b) &&
                    (V ? (ne($), ($ = -1)) : (V = !0), P(le, se - ee)))
                : ((R.sortIndex = J),
                  r(p, R),
                  G || Z || ((G = !0), W || ((W = !0), be()))),
              R
            );
          }),
          (n.unstable_shouldYield = Ye),
          (n.unstable_wrapCallback = function (R) {
            var q = C;
            return function () {
              var se = C;
              C = q;
              try {
                return R.apply(this, arguments);
              } finally {
                C = se;
              }
            };
          }));
      })(Ac)),
    Ac
  );
}
var rh;
function Ob() {
  return (rh || ((rh = 1), (Tc.exports = Cb())), Tc.exports);
}
var wc = { exports: {} },
  ht = {};
/**
 * @license React
 * react-dom.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */ var uh;
function Mb() {
  if (uh) return ht;
  uh = 1;
  var n = Yc();
  function r(p) {
    var b = 'https://react.dev/errors/' + p;
    if (1 < arguments.length) {
      b += '?args[]=' + encodeURIComponent(arguments[1]);
      for (var S = 2; S < arguments.length; S++)
        b += '&args[]=' + encodeURIComponent(arguments[S]);
    }
    return (
      'Minified React error #' +
      p +
      '; visit ' +
      b +
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
  function d(p, b, S) {
    var x =
      3 < arguments.length && arguments[3] !== void 0 ? arguments[3] : null;
    return {
      $$typeof: f,
      key: x == null ? null : '' + x,
      children: p,
      containerInfo: b,
      implementation: S,
    };
  }
  var h = n.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  function v(p, b) {
    if (p === 'font') return '';
    if (typeof b == 'string') return b === 'use-credentials' ? b : '';
  }
  return (
    (ht.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = c),
    (ht.createPortal = function (p, b) {
      var S =
        2 < arguments.length && arguments[2] !== void 0 ? arguments[2] : null;
      if (!b || (b.nodeType !== 1 && b.nodeType !== 9 && b.nodeType !== 11))
        throw Error(r(299));
      return d(p, b, null, S);
    }),
    (ht.flushSync = function (p) {
      var b = h.T,
        S = c.p;
      try {
        if (((h.T = null), (c.p = 2), p)) return p();
      } finally {
        ((h.T = b), (c.p = S), c.d.f());
      }
    }),
    (ht.preconnect = function (p, b) {
      typeof p == 'string' &&
        (b
          ? ((b = b.crossOrigin),
            (b =
              typeof b == 'string'
                ? b === 'use-credentials'
                  ? b
                  : ''
                : void 0))
          : (b = null),
        c.d.C(p, b));
    }),
    (ht.prefetchDNS = function (p) {
      typeof p == 'string' && c.d.D(p);
    }),
    (ht.preinit = function (p, b) {
      if (typeof p == 'string' && b && typeof b.as == 'string') {
        var S = b.as,
          x = v(S, b.crossOrigin),
          C = typeof b.integrity == 'string' ? b.integrity : void 0,
          Z = typeof b.fetchPriority == 'string' ? b.fetchPriority : void 0;
        S === 'style'
          ? c.d.S(p, typeof b.precedence == 'string' ? b.precedence : void 0, {
              crossOrigin: x,
              integrity: C,
              fetchPriority: Z,
            })
          : S === 'script' &&
            c.d.X(p, {
              crossOrigin: x,
              integrity: C,
              fetchPriority: Z,
              nonce: typeof b.nonce == 'string' ? b.nonce : void 0,
            });
      }
    }),
    (ht.preinitModule = function (p, b) {
      if (typeof p == 'string')
        if (typeof b == 'object' && b !== null) {
          if (b.as == null || b.as === 'script') {
            var S = v(b.as, b.crossOrigin);
            c.d.M(p, {
              crossOrigin: S,
              integrity: typeof b.integrity == 'string' ? b.integrity : void 0,
              nonce: typeof b.nonce == 'string' ? b.nonce : void 0,
            });
          }
        } else b == null && c.d.M(p);
    }),
    (ht.preload = function (p, b) {
      if (
        typeof p == 'string' &&
        typeof b == 'object' &&
        b !== null &&
        typeof b.as == 'string'
      ) {
        var S = b.as,
          x = v(S, b.crossOrigin);
        c.d.L(p, S, {
          crossOrigin: x,
          integrity: typeof b.integrity == 'string' ? b.integrity : void 0,
          nonce: typeof b.nonce == 'string' ? b.nonce : void 0,
          type: typeof b.type == 'string' ? b.type : void 0,
          fetchPriority:
            typeof b.fetchPriority == 'string' ? b.fetchPriority : void 0,
          referrerPolicy:
            typeof b.referrerPolicy == 'string' ? b.referrerPolicy : void 0,
          imageSrcSet:
            typeof b.imageSrcSet == 'string' ? b.imageSrcSet : void 0,
          imageSizes: typeof b.imageSizes == 'string' ? b.imageSizes : void 0,
          media: typeof b.media == 'string' ? b.media : void 0,
        });
      }
    }),
    (ht.preloadModule = function (p, b) {
      if (typeof p == 'string')
        if (b) {
          var S = v(b.as, b.crossOrigin);
          c.d.m(p, {
            as: typeof b.as == 'string' && b.as !== 'script' ? b.as : void 0,
            crossOrigin: S,
            integrity: typeof b.integrity == 'string' ? b.integrity : void 0,
          });
        } else c.d.m(p);
    }),
    (ht.requestFormReset = function (p) {
      c.d.r(p);
    }),
    (ht.unstable_batchedUpdates = function (p, b) {
      return p(b);
    }),
    (ht.useFormState = function (p, b, S) {
      return h.H.useFormState(p, b, S);
    }),
    (ht.useFormStatus = function () {
      return h.H.useHostTransitionStatus();
    }),
    (ht.version = '19.2.5'),
    ht
  );
}
var ch;
function $h() {
  if (ch) return wc.exports;
  ch = 1;
  function n() {
    if (
      !(
        typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > 'u' ||
        typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE != 'function'
      )
    )
      try {
        __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(n);
      } catch (r) {
        console.error(r);
      }
  }
  return (n(), (wc.exports = Mb()), wc.exports);
}
/**
 * @license React
 * react-dom-client.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */ var oh;
function Db() {
  if (oh) return hi;
  oh = 1;
  var n = Ob(),
    r = Yc(),
    u = $h();
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
  function h(e) {
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
  function v(e) {
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
  function b(e) {
    var t = e.alternate;
    if (!t) {
      if (((t = d(e)), t === null)) throw Error(c(188));
      return t !== e ? null : e;
    }
    for (var a = e, l = t; ; ) {
      var i = a.return;
      if (i === null) break;
      var s = i.alternate;
      if (s === null) {
        if (((l = i.return), l !== null)) {
          a = l;
          continue;
        }
        break;
      }
      if (i.child === s.child) {
        for (s = i.child; s; ) {
          if (s === a) return (p(i), e);
          if (s === l) return (p(i), t);
          s = s.sibling;
        }
        throw Error(c(188));
      }
      if (a.return !== l.return) ((a = i), (l = s));
      else {
        for (var o = !1, y = i.child; y; ) {
          if (y === a) {
            ((o = !0), (a = i), (l = s));
            break;
          }
          if (y === l) {
            ((o = !0), (l = i), (a = s));
            break;
          }
          y = y.sibling;
        }
        if (!o) {
          for (y = s.child; y; ) {
            if (y === a) {
              ((o = !0), (a = s), (l = i));
              break;
            }
            if (y === l) {
              ((o = !0), (l = s), (a = i));
              break;
            }
            y = y.sibling;
          }
          if (!o) throw Error(c(189));
        }
      }
      if (a.alternate !== l) throw Error(c(190));
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
  var x = Object.assign,
    C = Symbol.for('react.element'),
    Z = Symbol.for('react.transitional.element'),
    G = Symbol.for('react.portal'),
    V = Symbol.for('react.fragment'),
    U = Symbol.for('react.strict_mode'),
    B = Symbol.for('react.profiler'),
    ne = Symbol.for('react.consumer'),
    ae = Symbol.for('react.context'),
    te = Symbol.for('react.forward_ref'),
    le = Symbol.for('react.suspense'),
    W = Symbol.for('react.suspense_list'),
    $ = Symbol.for('react.memo'),
    X = Symbol.for('react.lazy'),
    ye = Symbol.for('react.activity'),
    Ye = Symbol.for('react.memo_cache_sentinel'),
    Re = Symbol.iterator;
  function be(e) {
    return e === null || typeof e != 'object'
      ? null
      : ((e = (Re && e[Re]) || e['@@iterator']),
        typeof e == 'function' ? e : null);
  }
  var Ue = Symbol.for('react.client.reference');
  function ze(e) {
    if (e == null) return null;
    if (typeof e == 'function')
      return e.$$typeof === Ue ? null : e.displayName || e.name || null;
    if (typeof e == 'string') return e;
    switch (e) {
      case V:
        return 'Fragment';
      case B:
        return 'Profiler';
      case U:
        return 'StrictMode';
      case le:
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
        case ae:
          return e.displayName || 'Context';
        case ne:
          return (e._context.displayName || 'Context') + '.Consumer';
        case te:
          var t = e.render;
          return (
            (e = e.displayName),
            e ||
              ((e = t.displayName || t.name || ''),
              (e = e !== '' ? 'ForwardRef(' + e + ')' : 'ForwardRef')),
            e
          );
        case $:
          return (
            (t = e.displayName || null),
            t !== null ? t : ze(e.type) || 'Memo'
          );
        case X:
          ((t = e._payload), (e = e._init));
          try {
            return ze(e(t));
          } catch {}
      }
    return null;
  }
  var P = Array.isArray,
    R = r.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,
    q = u.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,
    se = { pending: !1, data: null, method: null, action: null },
    ee = [],
    J = -1;
  function w(e) {
    return { current: e };
  }
  function g(e) {
    0 > J || ((e.current = ee[J]), (ee[J] = null), J--);
  }
  function T(e, t) {
    (J++, (ee[J] = e.current), (e.current = t));
  }
  var M = w(null),
    Q = w(null),
    K = w(null),
    I = w(null);
  function fe(e, t) {
    switch ((T(K, t), T(Q, e), T(M, null), t.nodeType)) {
      case 9:
      case 11:
        e = (e = t.documentElement) && (e = e.namespaceURI) ? wm(e) : 0;
        break;
      default:
        if (((e = t.tagName), (t = t.namespaceURI)))
          ((t = wm(t)), (e = jm(t, e)));
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
    (g(M), T(M, e));
  }
  function L() {
    (g(M), g(Q), g(K));
  }
  function F(e) {
    e.memoizedState !== null && T(I, e);
    var t = M.current,
      a = jm(t, e.type);
    t !== a && (T(Q, e), T(M, a));
  }
  function Se(e) {
    (Q.current === e && (g(M), g(Q)),
      I.current === e && (g(I), (ci._currentValue = se)));
  }
  var Ke, pe;
  function me(e) {
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
      var l = {
        DetermineComponentFrameRoot: function () {
          try {
            if (t) {
              var Y = function () {
                throw Error();
              };
              if (
                (Object.defineProperty(Y.prototype, 'props', {
                  set: function () {
                    throw Error();
                  },
                }),
                typeof Reflect == 'object' && Reflect.construct)
              ) {
                try {
                  Reflect.construct(Y, []);
                } catch (D) {
                  var O = D;
                }
                Reflect.construct(e, [], Y);
              } else {
                try {
                  Y.call();
                } catch (D) {
                  O = D;
                }
                e.call(Y.prototype);
              }
            } else {
              try {
                throw Error();
              } catch (D) {
                O = D;
              }
              (Y = e()) &&
                typeof Y.catch == 'function' &&
                Y.catch(function () {});
            }
          } catch (D) {
            if (D && O && typeof D.stack == 'string') return [D.stack, O.stack];
          }
          return [null, null];
        },
      };
      l.DetermineComponentFrameRoot.displayName = 'DetermineComponentFrameRoot';
      var i = Object.getOwnPropertyDescriptor(
        l.DetermineComponentFrameRoot,
        'name',
      );
      i &&
        i.configurable &&
        Object.defineProperty(l.DetermineComponentFrameRoot, 'name', {
          value: 'DetermineComponentFrameRoot',
        });
      var s = l.DetermineComponentFrameRoot(),
        o = s[0],
        y = s[1];
      if (o && y) {
        var E = o.split(`
`),
          _ = y.split(`
`);
        for (
          i = l = 0;
          l < E.length && !E[l].includes('DetermineComponentFrameRoot');
        )
          l++;
        for (; i < _.length && !_[i].includes('DetermineComponentFrameRoot'); )
          i++;
        if (l === E.length || i === _.length)
          for (
            l = E.length - 1, i = _.length - 1;
            1 <= l && 0 <= i && E[l] !== _[i];
          )
            i--;
        for (; 1 <= l && 0 <= i; l--, i--)
          if (E[l] !== _[i]) {
            if (l !== 1 || i !== 1)
              do
                if ((l--, i--, 0 > i || E[l] !== _[i])) {
                  var k =
                    `
` + E[l].replace(' at new ', ' at ');
                  return (
                    e.displayName &&
                      k.includes('<anonymous>') &&
                      (k = k.replace('<anonymous>', e.displayName)),
                    k
                  );
                }
              while (1 <= l && 0 <= i);
            break;
          }
      }
    } finally {
      ((Le = !1), (Error.prepareStackTrace = a));
    }
    return (a = e ? e.displayName || e.name : '') ? me(a) : '';
  }
  function il(e, t) {
    switch (e.tag) {
      case 26:
      case 27:
      case 5:
        return me(e.type);
      case 16:
        return me('Lazy');
      case 13:
        return e.child !== t && t !== null
          ? me('Suspense Fallback')
          : me('Suspense');
      case 19:
        return me('SuspenseList');
      case 0:
      case 15:
        return ia(e.type, !1);
      case 11:
        return ia(e.type.render, !1);
      case 1:
        return ia(e.type, !0);
      case 31:
        return me('Activity');
      default:
        return '';
    }
  }
  function sl(e) {
    try {
      var t = '',
        a = null;
      do ((t += il(e, a)), (a = e), (e = e.return));
      while (e);
      return t;
    } catch (l) {
      return (
        `
Error generating stack: ` +
        l.message +
        `
` +
        l.stack
      );
    }
  }
  var xn = Object.prototype.hasOwnProperty,
    sr = n.unstable_scheduleCallback,
    rr = n.unstable_cancelCallback,
    ap = n.unstable_shouldYield,
    lp = n.unstable_requestPaint,
    At = n.unstable_now,
    np = n.unstable_getCurrentPriorityLevel,
    to = n.unstable_ImmediatePriority,
    ao = n.unstable_UserBlockingPriority,
    Ei = n.unstable_NormalPriority,
    ip = n.unstable_LowPriority,
    lo = n.unstable_IdlePriority,
    sp = n.log,
    rp = n.unstable_setDisableYieldValue,
    Sn = null,
    wt = null;
  function za(e) {
    if (
      (typeof sp == 'function' && rp(e),
      wt && typeof wt.setStrictMode == 'function')
    )
      try {
        wt.setStrictMode(Sn, e);
      } catch {}
  }
  var jt = Math.clz32 ? Math.clz32 : op,
    up = Math.log,
    cp = Math.LN2;
  function op(e) {
    return ((e >>>= 0), e === 0 ? 32 : (31 - ((up(e) / cp) | 0)) | 0);
  }
  var Ti = 256,
    Ai = 262144,
    wi = 4194304;
  function rl(e) {
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
    var l = e.pendingLanes;
    if (l === 0) return 0;
    var i = 0,
      s = e.suspendedLanes,
      o = e.pingedLanes;
    e = e.warmLanes;
    var y = l & 134217727;
    return (
      y !== 0
        ? ((l = y & ~s),
          l !== 0
            ? (i = rl(l))
            : ((o &= y),
              o !== 0
                ? (i = rl(o))
                : a || ((a = y & ~e), a !== 0 && (i = rl(a)))))
        : ((y = l & ~s),
          y !== 0
            ? (i = rl(y))
            : o !== 0
              ? (i = rl(o))
              : a || ((a = l & ~e), a !== 0 && (i = rl(a)))),
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
  function En(e, t) {
    return (e.pendingLanes & ~(e.suspendedLanes & ~e.pingedLanes) & t) === 0;
  }
  function fp(e, t) {
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
  function no() {
    var e = wi;
    return ((wi <<= 1), (wi & 62914560) === 0 && (wi = 4194304), e);
  }
  function ur(e) {
    for (var t = [], a = 0; 31 > a; a++) t.push(e);
    return t;
  }
  function Tn(e, t) {
    ((e.pendingLanes |= t),
      t !== 268435456 &&
        ((e.suspendedLanes = 0), (e.pingedLanes = 0), (e.warmLanes = 0)));
  }
  function dp(e, t, a, l, i, s) {
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
      E = e.expirationTimes,
      _ = e.hiddenUpdates;
    for (a = o & ~a; 0 < a; ) {
      var k = 31 - jt(a),
        Y = 1 << k;
      ((y[k] = 0), (E[k] = -1));
      var O = _[k];
      if (O !== null)
        for (_[k] = null, k = 0; k < O.length; k++) {
          var D = O[k];
          D !== null && (D.lane &= -536870913);
        }
      a &= ~Y;
    }
    (l !== 0 && io(e, l, 0),
      s !== 0 && i === 0 && e.tag !== 0 && (e.suspendedLanes |= s & ~(o & ~t)));
  }
  function io(e, t, a) {
    ((e.pendingLanes |= t), (e.suspendedLanes &= ~t));
    var l = 31 - jt(t);
    ((e.entangledLanes |= t),
      (e.entanglements[l] = e.entanglements[l] | 1073741824 | (a & 261930)));
  }
  function so(e, t) {
    var a = (e.entangledLanes |= t);
    for (e = e.entanglements; a; ) {
      var l = 31 - jt(a),
        i = 1 << l;
      ((i & t) | (e[l] & t) && (e[l] |= t), (a &= ~i));
    }
  }
  function ro(e, t) {
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
  function uo() {
    var e = q.p;
    return e !== 0 ? e : ((e = window.event), e === void 0 ? 32 : $m(e.type));
  }
  function co(e, t) {
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
    Ol = '__reactContainer$' + _a,
    fr = '__reactEvents$' + _a,
    mp = '__reactListeners$' + _a,
    hp = '__reactHandles$' + _a,
    oo = '__reactResources$' + _a,
    An = '__reactMarker$' + _a;
  function dr(e) {
    (delete e[ct], delete e[gt], delete e[fr], delete e[mp], delete e[hp]);
  }
  function Ml(e) {
    var t = e[ct];
    if (t) return t;
    for (var a = e.parentNode; a; ) {
      if ((t = a[Ol] || a[ct])) {
        if (
          ((a = t.alternate),
          t.child !== null || (a !== null && a.child !== null))
        )
          for (e = Mm(e); e !== null; ) {
            if ((a = e[ct])) return a;
            e = Mm(e);
          }
        return t;
      }
      ((e = a), (a = e.parentNode));
    }
    return null;
  }
  function Dl(e) {
    if ((e = e[ct] || e[Ol])) {
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
  function wn(e) {
    var t = e.tag;
    if (t === 5 || t === 26 || t === 27 || t === 6) return e.stateNode;
    throw Error(c(33));
  }
  function Ul(e) {
    var t = e[oo];
    return (
      t ||
        (t = e[oo] =
          { hoistableStyles: new Map(), hoistableScripts: new Map() }),
      t
    );
  }
  function it(e) {
    e[An] = !0;
  }
  var fo = new Set(),
    mo = {};
  function ul(e, t) {
    (kl(e, t), kl(e + 'Capture', t));
  }
  function kl(e, t) {
    for (mo[e] = t, e = 0; e < t.length; e++) fo.add(t[e]);
  }
  var yp = RegExp(
      '^[:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD][:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD\\-.0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040]*$',
    ),
    ho = {},
    yo = {};
  function pp(e) {
    return xn.call(yo, e)
      ? !0
      : xn.call(ho, e)
        ? !1
        : yp.test(e)
          ? (yo[e] = !0)
          : ((ho[e] = !0), !1);
  }
  function Ni(e, t, a) {
    if (pp(t))
      if (a === null) e.removeAttribute(t);
      else {
        switch (typeof a) {
          case 'undefined':
          case 'function':
          case 'symbol':
            e.removeAttribute(t);
            return;
          case 'boolean':
            var l = t.toLowerCase().slice(0, 5);
            if (l !== 'data-' && l !== 'aria-') {
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
  function sa(e, t, a, l) {
    if (l === null) e.removeAttribute(a);
    else {
      switch (typeof l) {
        case 'undefined':
        case 'function':
        case 'symbol':
        case 'boolean':
          e.removeAttribute(a);
          return;
      }
      e.setAttributeNS(t, a, '' + l);
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
  function po(e) {
    var t = e.type;
    return (
      (e = e.nodeName) &&
      e.toLowerCase() === 'input' &&
      (t === 'checkbox' || t === 'radio')
    );
  }
  function gp(e, t, a) {
    var l = Object.getOwnPropertyDescriptor(e.constructor.prototype, t);
    if (
      !e.hasOwnProperty(t) &&
      typeof l < 'u' &&
      typeof l.get == 'function' &&
      typeof l.set == 'function'
    ) {
      var i = l.get,
        s = l.set;
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
        Object.defineProperty(e, t, { enumerable: l.enumerable }),
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
  function mr(e) {
    if (!e._valueTracker) {
      var t = po(e) ? 'checked' : 'value';
      e._valueTracker = gp(e, t, '' + e[t]);
    }
  }
  function go(e) {
    if (!e) return !1;
    var t = e._valueTracker;
    if (!t) return !0;
    var a = t.getValue(),
      l = '';
    return (
      e && (l = po(e) ? (e.checked ? 'true' : 'false') : e.value),
      (e = l),
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
  var bp = /[\n"\\]/g;
  function kt(e) {
    return e.replace(bp, function (t) {
      return '\\' + t.charCodeAt(0).toString(16) + ' ';
    });
  }
  function hr(e, t, a, l, i, s, o, y) {
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
          : l != null && e.removeAttribute('value'),
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
  function bo(e, t, a, l, i, s, o, y) {
    if (
      (s != null &&
        typeof s != 'function' &&
        typeof s != 'symbol' &&
        typeof s != 'boolean' &&
        (e.type = s),
      t != null || a != null)
    ) {
      if (!((s !== 'submit' && s !== 'reset') || t != null)) {
        mr(e);
        return;
      }
      ((a = a != null ? '' + Ut(a) : ''),
        (t = t != null ? '' + Ut(t) : a),
        y || t === e.value || (e.value = t),
        (e.defaultValue = t));
    }
    ((l = l ?? i),
      (l = typeof l != 'function' && typeof l != 'symbol' && !!l),
      (e.checked = y ? e.checked : !!l),
      (e.defaultChecked = !!l),
      o != null &&
        typeof o != 'function' &&
        typeof o != 'symbol' &&
        typeof o != 'boolean' &&
        (e.name = o),
      mr(e));
  }
  function yr(e, t, a) {
    (t === 'number' && zi(e.ownerDocument) === e) ||
      e.defaultValue === '' + a ||
      (e.defaultValue = '' + a);
  }
  function Bl(e, t, a, l) {
    if (((e = e.options), t)) {
      t = {};
      for (var i = 0; i < a.length; i++) t['$' + a[i]] = !0;
      for (a = 0; a < e.length; a++)
        ((i = t.hasOwnProperty('$' + e[a].value)),
          e[a].selected !== i && (e[a].selected = i),
          i && l && (e[a].defaultSelected = !0));
    } else {
      for (a = '' + Ut(a), t = null, i = 0; i < e.length; i++) {
        if (e[i].value === a) {
          ((e[i].selected = !0), l && (e[i].defaultSelected = !0));
          return;
        }
        t !== null || e[i].disabled || (t = e[i]);
      }
      t !== null && (t.selected = !0);
    }
  }
  function vo(e, t, a) {
    if (
      t != null &&
      ((t = '' + Ut(t)), t !== e.value && (e.value = t), a == null)
    ) {
      e.defaultValue !== t && (e.defaultValue = t);
      return;
    }
    e.defaultValue = a != null ? '' + Ut(a) : '';
  }
  function xo(e, t, a, l) {
    if (t == null) {
      if (l != null) {
        if (a != null) throw Error(c(92));
        if (P(l)) {
          if (1 < l.length) throw Error(c(93));
          l = l[0];
        }
        a = l;
      }
      (a == null && (a = ''), (t = a));
    }
    ((a = Ut(t)),
      (e.defaultValue = a),
      (l = e.textContent),
      l === a && l !== '' && l !== null && (e.value = l),
      mr(e));
  }
  function Hl(e, t) {
    if (t) {
      var a = e.firstChild;
      if (a && a === e.lastChild && a.nodeType === 3) {
        a.nodeValue = t;
        return;
      }
    }
    e.textContent = t;
  }
  var vp = new Set(
    'animationIterationCount aspectRatio borderImageOutset borderImageSlice borderImageWidth boxFlex boxFlexGroup boxOrdinalGroup columnCount columns flex flexGrow flexPositive flexShrink flexNegative flexOrder gridArea gridRow gridRowEnd gridRowSpan gridRowStart gridColumn gridColumnEnd gridColumnSpan gridColumnStart fontWeight lineClamp lineHeight opacity order orphans scale tabSize widows zIndex zoom fillOpacity floodOpacity stopOpacity strokeDasharray strokeDashoffset strokeMiterlimit strokeOpacity strokeWidth MozAnimationIterationCount MozBoxFlex MozBoxFlexGroup MozLineClamp msAnimationIterationCount msFlex msZoom msFlexGrow msFlexNegative msFlexOrder msFlexPositive msFlexShrink msGridColumn msGridColumnSpan msGridRow msGridRowSpan WebkitAnimationIterationCount WebkitBoxFlex WebKitBoxFlexGroup WebkitBoxOrdinalGroup WebkitColumnCount WebkitColumns WebkitFlex WebkitFlexGrow WebkitFlexPositive WebkitFlexShrink WebkitLineClamp'.split(
      ' ',
    ),
  );
  function So(e, t, a) {
    var l = t.indexOf('--') === 0;
    a == null || typeof a == 'boolean' || a === ''
      ? l
        ? e.setProperty(t, '')
        : t === 'float'
          ? (e.cssFloat = '')
          : (e[t] = '')
      : l
        ? e.setProperty(t, a)
        : typeof a != 'number' || a === 0 || vp.has(t)
          ? t === 'float'
            ? (e.cssFloat = a)
            : (e[t] = ('' + a).trim())
          : (e[t] = a + 'px');
  }
  function Eo(e, t, a) {
    if (t != null && typeof t != 'object') throw Error(c(62));
    if (((e = e.style), a != null)) {
      for (var l in a)
        !a.hasOwnProperty(l) ||
          (t != null && t.hasOwnProperty(l)) ||
          (l.indexOf('--') === 0
            ? e.setProperty(l, '')
            : l === 'float'
              ? (e.cssFloat = '')
              : (e[l] = ''));
      for (var i in t)
        ((l = t[i]), t.hasOwnProperty(i) && a[i] !== l && So(e, i, l));
    } else for (var s in t) t.hasOwnProperty(s) && So(e, s, t[s]);
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
  var xp = new Map([
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
    Sp =
      /^[\u0000-\u001F ]*j[\r\n\t]*a[\r\n\t]*v[\r\n\t]*a[\r\n\t]*s[\r\n\t]*c[\r\n\t]*r[\r\n\t]*i[\r\n\t]*p[\r\n\t]*t[\r\n\t]*:/i;
  function _i(e) {
    return Sp.test('' + e)
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
  var ql = null,
    Ll = null;
  function To(e) {
    var t = Dl(e);
    if (t && (e = t.stateNode)) {
      var a = e[gt] || null;
      e: switch (((e = t.stateNode), t.type)) {
        case 'input':
          if (
            (hr(
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
              var l = a[t];
              if (l !== e && l.form === e.form) {
                var i = l[gt] || null;
                if (!i) throw Error(c(90));
                hr(
                  l,
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
              ((l = a[t]), l.form === e.form && go(l));
          }
          break e;
        case 'textarea':
          vo(e, a.value, a.defaultValue);
          break e;
        case 'select':
          ((t = a.value), t != null && Bl(e, !!a.multiple, t, !1));
      }
    }
  }
  var vr = !1;
  function Ao(e, t, a) {
    if (vr) return e(t, a);
    vr = !0;
    try {
      var l = e(t);
      return l;
    } finally {
      if (
        ((vr = !1),
        (ql !== null || Ll !== null) &&
          (gs(), ql && ((t = ql), (e = Ll), (Ll = ql = null), To(t), e)))
      )
        for (t = 0; t < e.length; t++) To(e[t]);
    }
  }
  function jn(e, t) {
    var a = e.stateNode;
    if (a === null) return null;
    var l = a[gt] || null;
    if (l === null) return null;
    a = l[t];
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
        ((l = !l.disabled) ||
          ((e = e.type),
          (l = !(
            e === 'button' ||
            e === 'input' ||
            e === 'select' ||
            e === 'textarea'
          ))),
          (e = !l));
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
      var Nn = {};
      (Object.defineProperty(Nn, 'passive', {
        get: function () {
          xr = !0;
        },
      }),
        window.addEventListener('test', Nn, Nn),
        window.removeEventListener('test', Nn, Nn));
    } catch {
      xr = !1;
    }
  var Ca = null,
    Sr = null,
    Ci = null;
  function wo() {
    if (Ci) return Ci;
    var e,
      t = Sr,
      a = t.length,
      l,
      i = 'value' in Ca ? Ca.value : Ca.textContent,
      s = i.length;
    for (e = 0; e < a && t[e] === i[e]; e++);
    var o = a - e;
    for (l = 1; l <= o && t[a - l] === i[s - l]; l++);
    return (Ci = i.slice(e, 1 < l ? 1 - l : void 0));
  }
  function Oi(e) {
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
  function jo() {
    return !1;
  }
  function bt(e) {
    function t(a, l, i, s, o) {
      ((this._reactName = a),
        (this._targetInst = i),
        (this.type = l),
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
          : jo),
        (this.isPropagationStopped = jo),
        this
      );
    }
    return (
      x(t.prototype, {
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
  var cl = {
      eventPhase: 0,
      bubbles: 0,
      cancelable: 0,
      timeStamp: function (e) {
        return e.timeStamp || Date.now();
      },
      defaultPrevented: 0,
      isTrusted: 0,
    },
    Di = bt(cl),
    Rn = x({}, cl, { view: 0, detail: 0 }),
    Ep = bt(Rn),
    Er,
    Tr,
    zn,
    Ui = x({}, Rn, {
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
          : (e !== zn &&
              (zn && e.type === 'mousemove'
                ? ((Er = e.screenX - zn.screenX), (Tr = e.screenY - zn.screenY))
                : (Tr = Er = 0),
              (zn = e)),
            Er);
      },
      movementY: function (e) {
        return 'movementY' in e ? e.movementY : Tr;
      },
    }),
    No = bt(Ui),
    Tp = x({}, Ui, { dataTransfer: 0 }),
    Ap = bt(Tp),
    wp = x({}, Rn, { relatedTarget: 0 }),
    Ar = bt(wp),
    jp = x({}, cl, { animationName: 0, elapsedTime: 0, pseudoElement: 0 }),
    Np = bt(jp),
    Rp = x({}, cl, {
      clipboardData: function (e) {
        return 'clipboardData' in e ? e.clipboardData : window.clipboardData;
      },
    }),
    zp = bt(Rp),
    _p = x({}, cl, { data: 0 }),
    Ro = bt(_p),
    Cp = {
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
    Op = {
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
    Mp = {
      Alt: 'altKey',
      Control: 'ctrlKey',
      Meta: 'metaKey',
      Shift: 'shiftKey',
    };
  function Dp(e) {
    var t = this.nativeEvent;
    return t.getModifierState
      ? t.getModifierState(e)
      : (e = Mp[e])
        ? !!t[e]
        : !1;
  }
  function wr() {
    return Dp;
  }
  var Up = x({}, Rn, {
      key: function (e) {
        if (e.key) {
          var t = Cp[e.key] || e.key;
          if (t !== 'Unidentified') return t;
        }
        return e.type === 'keypress'
          ? ((e = Oi(e)), e === 13 ? 'Enter' : String.fromCharCode(e))
          : e.type === 'keydown' || e.type === 'keyup'
            ? Op[e.keyCode] || 'Unidentified'
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
        return e.type === 'keypress' ? Oi(e) : 0;
      },
      keyCode: function (e) {
        return e.type === 'keydown' || e.type === 'keyup' ? e.keyCode : 0;
      },
      which: function (e) {
        return e.type === 'keypress'
          ? Oi(e)
          : e.type === 'keydown' || e.type === 'keyup'
            ? e.keyCode
            : 0;
      },
    }),
    kp = bt(Up),
    Bp = x({}, Ui, {
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
    zo = bt(Bp),
    Hp = x({}, Rn, {
      touches: 0,
      targetTouches: 0,
      changedTouches: 0,
      altKey: 0,
      metaKey: 0,
      ctrlKey: 0,
      shiftKey: 0,
      getModifierState: wr,
    }),
    qp = bt(Hp),
    Lp = x({}, cl, { propertyName: 0, elapsedTime: 0, pseudoElement: 0 }),
    Yp = bt(Lp),
    Gp = x({}, Ui, {
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
    Xp = bt(Gp),
    Zp = x({}, cl, { newState: 0, oldState: 0 }),
    Vp = bt(Zp),
    Qp = [9, 13, 27, 32],
    jr = ua && 'CompositionEvent' in window,
    _n = null;
  ua && 'documentMode' in document && (_n = document.documentMode);
  var Kp = ua && 'TextEvent' in window && !_n,
    _o = ua && (!jr || (_n && 8 < _n && 11 >= _n)),
    Co = ' ',
    Oo = !1;
  function Mo(e, t) {
    switch (e) {
      case 'keyup':
        return Qp.indexOf(t.keyCode) !== -1;
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
  function Do(e) {
    return (
      (e = e.detail),
      typeof e == 'object' && 'data' in e ? e.data : null
    );
  }
  var Yl = !1;
  function Jp(e, t) {
    switch (e) {
      case 'compositionend':
        return Do(t);
      case 'keypress':
        return t.which !== 32 ? null : ((Oo = !0), Co);
      case 'textInput':
        return ((e = t.data), e === Co && Oo ? null : e);
      default:
        return null;
    }
  }
  function $p(e, t) {
    if (Yl)
      return e === 'compositionend' || (!jr && Mo(e, t))
        ? ((e = wo()), (Ci = Sr = Ca = null), (Yl = !1), e)
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
        return _o && t.locale !== 'ko' ? null : t.data;
      default:
        return null;
    }
  }
  var Wp = {
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
  function Uo(e) {
    var t = e && e.nodeName && e.nodeName.toLowerCase();
    return t === 'input' ? !!Wp[e.type] : t === 'textarea';
  }
  function ko(e, t, a, l) {
    (ql ? (Ll ? Ll.push(l) : (Ll = [l])) : (ql = l),
      (t = As(t, 'onChange')),
      0 < t.length &&
        ((a = new Di('onChange', 'change', null, a, l)),
        e.push({ event: a, listeners: t })));
  }
  var Cn = null,
    On = null;
  function Fp(e) {
    vm(e, 0);
  }
  function ki(e) {
    var t = wn(e);
    if (go(t)) return e;
  }
  function Bo(e, t) {
    if (e === 'change') return t;
  }
  var Ho = !1;
  if (ua) {
    var Nr;
    if (ua) {
      var Rr = 'oninput' in document;
      if (!Rr) {
        var qo = document.createElement('div');
        (qo.setAttribute('oninput', 'return;'),
          (Rr = typeof qo.oninput == 'function'));
      }
      Nr = Rr;
    } else Nr = !1;
    Ho = Nr && (!document.documentMode || 9 < document.documentMode);
  }
  function Lo() {
    Cn && (Cn.detachEvent('onpropertychange', Yo), (On = Cn = null));
  }
  function Yo(e) {
    if (e.propertyName === 'value' && ki(On)) {
      var t = [];
      (ko(t, On, e, br(e)), Ao(Fp, t));
    }
  }
  function Ip(e, t, a) {
    e === 'focusin'
      ? (Lo(), (Cn = t), (On = a), Cn.attachEvent('onpropertychange', Yo))
      : e === 'focusout' && Lo();
  }
  function Pp(e) {
    if (e === 'selectionchange' || e === 'keyup' || e === 'keydown')
      return ki(On);
  }
  function eg(e, t) {
    if (e === 'click') return ki(t);
  }
  function tg(e, t) {
    if (e === 'input' || e === 'change') return ki(t);
  }
  function ag(e, t) {
    return (e === t && (e !== 0 || 1 / e === 1 / t)) || (e !== e && t !== t);
  }
  var Nt = typeof Object.is == 'function' ? Object.is : ag;
  function Mn(e, t) {
    if (Nt(e, t)) return !0;
    if (
      typeof e != 'object' ||
      e === null ||
      typeof t != 'object' ||
      t === null
    )
      return !1;
    var a = Object.keys(e),
      l = Object.keys(t);
    if (a.length !== l.length) return !1;
    for (l = 0; l < a.length; l++) {
      var i = a[l];
      if (!xn.call(t, i) || !Nt(e[i], t[i])) return !1;
    }
    return !0;
  }
  function Go(e) {
    for (; e && e.firstChild; ) e = e.firstChild;
    return e;
  }
  function Xo(e, t) {
    var a = Go(e);
    e = 0;
    for (var l; a; ) {
      if (a.nodeType === 3) {
        if (((l = e + a.textContent.length), e <= t && l >= t))
          return { node: a, offset: t - e };
        e = l;
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
      a = Go(a);
    }
  }
  function Zo(e, t) {
    return e && t
      ? e === t
        ? !0
        : e && e.nodeType === 3
          ? !1
          : t && t.nodeType === 3
            ? Zo(e, t.parentNode)
            : 'contains' in e
              ? e.contains(t)
              : e.compareDocumentPosition
                ? !!(e.compareDocumentPosition(t) & 16)
                : !1
      : !1;
  }
  function Vo(e) {
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
  var lg = ua && 'documentMode' in document && 11 >= document.documentMode,
    Gl = null,
    _r = null,
    Dn = null,
    Cr = !1;
  function Qo(e, t, a) {
    var l =
      a.window === a ? a.document : a.nodeType === 9 ? a : a.ownerDocument;
    Cr ||
      Gl == null ||
      Gl !== zi(l) ||
      ((l = Gl),
      'selectionStart' in l && zr(l)
        ? (l = { start: l.selectionStart, end: l.selectionEnd })
        : ((l = (
            (l.ownerDocument && l.ownerDocument.defaultView) ||
            window
          ).getSelection()),
          (l = {
            anchorNode: l.anchorNode,
            anchorOffset: l.anchorOffset,
            focusNode: l.focusNode,
            focusOffset: l.focusOffset,
          })),
      (Dn && Mn(Dn, l)) ||
        ((Dn = l),
        (l = As(_r, 'onSelect')),
        0 < l.length &&
          ((t = new Di('onSelect', 'select', null, t, a)),
          e.push({ event: t, listeners: l }),
          (t.target = Gl))));
  }
  function ol(e, t) {
    var a = {};
    return (
      (a[e.toLowerCase()] = t.toLowerCase()),
      (a['Webkit' + e] = 'webkit' + t),
      (a['Moz' + e] = 'moz' + t),
      a
    );
  }
  var Xl = {
      animationend: ol('Animation', 'AnimationEnd'),
      animationiteration: ol('Animation', 'AnimationIteration'),
      animationstart: ol('Animation', 'AnimationStart'),
      transitionrun: ol('Transition', 'TransitionRun'),
      transitionstart: ol('Transition', 'TransitionStart'),
      transitioncancel: ol('Transition', 'TransitionCancel'),
      transitionend: ol('Transition', 'TransitionEnd'),
    },
    Or = {},
    Ko = {};
  ua &&
    ((Ko = document.createElement('div').style),
    'AnimationEvent' in window ||
      (delete Xl.animationend.animation,
      delete Xl.animationiteration.animation,
      delete Xl.animationstart.animation),
    'TransitionEvent' in window || delete Xl.transitionend.transition);
  function fl(e) {
    if (Or[e]) return Or[e];
    if (!Xl[e]) return e;
    var t = Xl[e],
      a;
    for (a in t) if (t.hasOwnProperty(a) && a in Ko) return (Or[e] = t[a]);
    return e;
  }
  var Jo = fl('animationend'),
    $o = fl('animationiteration'),
    Wo = fl('animationstart'),
    ng = fl('transitionrun'),
    ig = fl('transitionstart'),
    sg = fl('transitioncancel'),
    Fo = fl('transitionend'),
    Io = new Map(),
    Mr =
      'abort auxClick beforeToggle cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel'.split(
        ' ',
      );
  Mr.push('scrollEnd');
  function Qt(e, t) {
    (Io.set(e, t), ul(t, [e]));
  }
  var Bi =
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
    Bt = [],
    Zl = 0,
    Dr = 0;
  function Hi() {
    for (var e = Zl, t = (Dr = Zl = 0); t < e; ) {
      var a = Bt[t];
      Bt[t++] = null;
      var l = Bt[t];
      Bt[t++] = null;
      var i = Bt[t];
      Bt[t++] = null;
      var s = Bt[t];
      if (((Bt[t++] = null), l !== null && i !== null)) {
        var o = l.pending;
        (o === null ? (i.next = i) : ((i.next = o.next), (o.next = i)),
          (l.pending = i));
      }
      s !== 0 && Po(a, i, s);
    }
  }
  function qi(e, t, a, l) {
    ((Bt[Zl++] = e),
      (Bt[Zl++] = t),
      (Bt[Zl++] = a),
      (Bt[Zl++] = l),
      (Dr |= l),
      (e.lanes |= l),
      (e = e.alternate),
      e !== null && (e.lanes |= l));
  }
  function Ur(e, t, a, l) {
    return (qi(e, t, a, l), Li(e));
  }
  function dl(e, t) {
    return (qi(e, null, null, t), Li(e));
  }
  function Po(e, t, a) {
    e.lanes |= a;
    var l = e.alternate;
    l !== null && (l.lanes |= a);
    for (var i = !1, s = e.return; s !== null; )
      ((s.childLanes |= a),
        (l = s.alternate),
        l !== null && (l.childLanes |= a),
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
          (l = e[i]),
          l === null ? (e[i] = [t]) : l.push(t),
          (t.lane = a | 536870912)),
        s)
      : null;
  }
  function Li(e) {
    if (50 < ai) throw ((ai = 0), (Zu = null), Error(c(185)));
    for (var t = e.return; t !== null; ) ((e = t), (t = e.return));
    return e.tag === 3 ? e.stateNode : null;
  }
  var Vl = {};
  function rg(e, t, a, l) {
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
      (this.mode = l),
      (this.subtreeFlags = this.flags = 0),
      (this.deletions = null),
      (this.childLanes = this.lanes = 0),
      (this.alternate = null));
  }
  function Rt(e, t, a, l) {
    return new rg(e, t, a, l);
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
  function ef(e, t) {
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
  function Yi(e, t, a, l, i, s) {
    var o = 0;
    if (((l = e), typeof e == 'function')) kr(e) && (o = 1);
    else if (typeof e == 'string')
      o = db(e, a, M.current)
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
        case V:
          return ml(a.children, i, s, t);
        case U:
          ((o = 8), (i |= 24));
          break;
        case B:
          return (
            (e = Rt(12, a, t, i | 2)),
            (e.elementType = B),
            (e.lanes = s),
            e
          );
        case le:
          return (
            (e = Rt(13, a, t, i)),
            (e.elementType = le),
            (e.lanes = s),
            e
          );
        case W:
          return ((e = Rt(19, a, t, i)), (e.elementType = W), (e.lanes = s), e);
        default:
          if (typeof e == 'object' && e !== null)
            switch (e.$$typeof) {
              case ae:
                o = 10;
                break e;
              case ne:
                o = 9;
                break e;
              case te:
                o = 11;
                break e;
              case $:
                o = 14;
                break e;
              case X:
                ((o = 16), (l = null));
                break e;
            }
          ((o = 29),
            (a = Error(c(130, e === null ? 'null' : typeof e, ''))),
            (l = null));
      }
    return (
      (t = Rt(o, a, t, i)),
      (t.elementType = e),
      (t.type = l),
      (t.lanes = s),
      t
    );
  }
  function ml(e, t, a, l) {
    return ((e = Rt(7, e, l, t)), (e.lanes = a), e);
  }
  function Br(e, t, a) {
    return ((e = Rt(6, e, null, t)), (e.lanes = a), e);
  }
  function tf(e) {
    var t = Rt(18, null, null, 0);
    return ((t.stateNode = e), t);
  }
  function Hr(e, t, a) {
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
  var af = new WeakMap();
  function Ht(e, t) {
    if (typeof e == 'object' && e !== null) {
      var a = af.get(e);
      return a !== void 0
        ? a
        : ((t = { value: e, source: t, stack: sl(t) }), af.set(e, t), t);
    }
    return { value: e, source: t, stack: sl(t) };
  }
  var Ql = [],
    Kl = 0,
    Gi = null,
    Un = 0,
    qt = [],
    Lt = 0,
    Oa = null,
    Wt = 1,
    Ft = '';
  function oa(e, t) {
    ((Ql[Kl++] = Un), (Ql[Kl++] = Gi), (Gi = e), (Un = t));
  }
  function lf(e, t, a) {
    ((qt[Lt++] = Wt), (qt[Lt++] = Ft), (qt[Lt++] = Oa), (Oa = e));
    var l = Wt;
    e = Ft;
    var i = 32 - jt(l) - 1;
    ((l &= ~(1 << i)), (a += 1));
    var s = 32 - jt(t) + i;
    if (30 < s) {
      var o = i - (i % 5);
      ((s = (l & ((1 << o) - 1)).toString(32)),
        (l >>= o),
        (i -= o),
        (Wt = (1 << (32 - jt(t) + i)) | (a << i) | l),
        (Ft = s + e));
    } else ((Wt = (1 << s) | (a << i) | l), (Ft = e));
  }
  function qr(e) {
    e.return !== null && (oa(e, 1), lf(e, 1, 0));
  }
  function Lr(e) {
    for (; e === Gi; )
      ((Gi = Ql[--Kl]), (Ql[Kl] = null), (Un = Ql[--Kl]), (Ql[Kl] = null));
    for (; e === Oa; )
      ((Oa = qt[--Lt]),
        (qt[Lt] = null),
        (Ft = qt[--Lt]),
        (qt[Lt] = null),
        (Wt = qt[--Lt]),
        (qt[Lt] = null));
  }
  function nf(e, t) {
    ((qt[Lt++] = Wt),
      (qt[Lt++] = Ft),
      (qt[Lt++] = Oa),
      (Wt = t.id),
      (Ft = t.overflow),
      (Oa = e));
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
    throw (kn(Ht(t, e)), Yr);
  }
  function sf(e) {
    var t = e.stateNode,
      a = e.type,
      l = e.memoizedProps;
    switch (((t[ct] = e), (t[gt] = l), a)) {
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
        for (a = 0; a < ni.length; a++) Ae(ni[a], t);
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
          bo(
            t,
            l.value,
            l.defaultValue,
            l.checked,
            l.defaultChecked,
            l.type,
            l.name,
            !0,
          ));
        break;
      case 'select':
        Ae('invalid', t);
        break;
      case 'textarea':
        (Ae('invalid', t), xo(t, l.value, l.defaultValue, l.children));
    }
    ((a = l.children),
      (typeof a != 'string' && typeof a != 'number' && typeof a != 'bigint') ||
      t.textContent === '' + a ||
      l.suppressHydrationWarning === !0 ||
      Tm(t.textContent, a)
        ? (l.popover != null && (Ae('beforetoggle', t), Ae('toggle', t)),
          l.onScroll != null && Ae('scroll', t),
          l.onScrollEnd != null && Ae('scrollend', t),
          l.onClick != null && (t.onclick = ra),
          (t = !0))
        : (t = !1),
      t || Da(e, !0));
  }
  function rf(e) {
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
  function Jl(e) {
    if (e !== ot) return !1;
    if (!Ne) return (rf(e), (Ne = !0), !1);
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
      rf(e),
      t === 13)
    ) {
      if (((e = e.memoizedState), (e = e !== null ? e.dehydrated : null), !e))
        throw Error(c(317));
      Ge = Om(e);
    } else if (t === 31) {
      if (((e = e.memoizedState), (e = e !== null ? e.dehydrated : null), !e))
        throw Error(c(317));
      Ge = Om(e);
    } else
      t === 27
        ? ((t = Ge), Ja(e.type) ? ((e = oc), (oc = null), (Ge = e)) : (Ge = t))
        : (Ge = ot ? Xt(e.stateNode.nextSibling) : null);
    return !0;
  }
  function hl() {
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
  function kn(e) {
    Ma === null ? (Ma = [e]) : Ma.push(e);
  }
  var Xr = w(null),
    yl = null,
    fa = null;
  function Ua(e, t, a) {
    (T(Xr, t._currentValue), (t._currentValue = a));
  }
  function da(e) {
    ((e._currentValue = Xr.current), g(Xr));
  }
  function Zr(e, t, a) {
    for (; e !== null; ) {
      var l = e.alternate;
      if (
        ((e.childLanes & t) !== t
          ? ((e.childLanes |= t), l !== null && (l.childLanes |= t))
          : l !== null && (l.childLanes & t) !== t && (l.childLanes |= t),
        e === a)
      )
        break;
      e = e.return;
    }
  }
  function Vr(e, t, a, l) {
    var i = e.child;
    for (i !== null && (i.return = e); i !== null; ) {
      var s = i.dependencies;
      if (s !== null) {
        var o = i.child;
        s = s.firstContext;
        e: for (; s !== null; ) {
          var y = s;
          s = i;
          for (var E = 0; E < t.length; E++)
            if (y.context === t[E]) {
              ((s.lanes |= a),
                (y = s.alternate),
                y !== null && (y.lanes |= a),
                Zr(s.return, a, e),
                l || (o = null));
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
  function $l(e, t, a, l) {
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
      } else if (i === I.current) {
        if (((o = i.alternate), o === null)) throw Error(c(387));
        o.memoizedState.memoizedState !== i.memoizedState.memoizedState &&
          (e !== null ? e.push(ci) : (e = [ci]));
      }
      i = i.return;
    }
    (e !== null && Vr(t, e, a, l), (t.flags |= 262144));
  }
  function Xi(e) {
    for (e = e.firstContext; e !== null; ) {
      if (!Nt(e.context._currentValue, e.memoizedValue)) return !0;
      e = e.next;
    }
    return !1;
  }
  function pl(e) {
    ((yl = e),
      (fa = null),
      (e = e.dependencies),
      e !== null && (e.firstContext = null));
  }
  function ft(e) {
    return uf(yl, e);
  }
  function Zi(e, t) {
    return (yl === null && pl(e), uf(e, t));
  }
  function uf(e, t) {
    var a = t._currentValue;
    if (((t = { context: t, memoizedValue: a, next: null }), fa === null)) {
      if (e === null) throw Error(c(308));
      ((fa = t),
        (e.dependencies = { lanes: 0, firstContext: t }),
        (e.flags |= 524288));
    } else fa = fa.next = t;
    return a;
  }
  var ug =
      typeof AbortController < 'u'
        ? AbortController
        : function () {
            var e = [],
              t = (this.signal = {
                aborted: !1,
                addEventListener: function (a, l) {
                  e.push(l);
                },
              });
            this.abort = function () {
              ((t.aborted = !0),
                e.forEach(function (a) {
                  return a();
                }));
            };
          },
    cg = n.unstable_scheduleCallback,
    og = n.unstable_NormalPriority,
    Ie = {
      $$typeof: ae,
      Consumer: null,
      Provider: null,
      _currentValue: null,
      _currentValue2: null,
      _threadCount: 0,
    };
  function Qr() {
    return { controller: new ug(), data: new Map(), refCount: 0 };
  }
  function Bn(e) {
    (e.refCount--,
      e.refCount === 0 &&
        cg(og, function () {
          e.controller.abort();
        }));
  }
  var Hn = null,
    Kr = 0,
    Wl = 0,
    Fl = null;
  function fg(e, t) {
    if (Hn === null) {
      var a = (Hn = []);
      ((Kr = 0),
        (Wl = Wu()),
        (Fl = {
          status: 'pending',
          value: void 0,
          then: function (l) {
            a.push(l);
          },
        }));
    }
    return (Kr++, t.then(cf, cf), t);
  }
  function cf() {
    if (--Kr === 0 && Hn !== null) {
      Fl !== null && (Fl.status = 'fulfilled');
      var e = Hn;
      ((Hn = null), (Wl = 0), (Fl = null));
      for (var t = 0; t < e.length; t++) (0, e[t])();
    }
  }
  function dg(e, t) {
    var a = [],
      l = {
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
          ((l.status = 'fulfilled'), (l.value = t));
          for (var i = 0; i < a.length; i++) (0, a[i])(t);
        },
        function (i) {
          for (l.status = 'rejected', l.reason = i, i = 0; i < a.length; i++)
            (0, a[i])(void 0);
        },
      ),
      l
    );
  }
  var of = R.S;
  R.S = function (e, t) {
    ((Kd = At()),
      typeof t == 'object' &&
        t !== null &&
        typeof t.then == 'function' &&
        fg(e, t),
      of !== null && of(e, t));
  };
  var gl = w(null);
  function Jr() {
    var e = gl.current;
    return e !== null ? e : qe.pooledCache;
  }
  function Vi(e, t) {
    t === null ? T(gl, gl.current) : T(gl, t.pool);
  }
  function ff() {
    var e = Jr();
    return e === null ? null : { parent: Ie._currentValue, pool: e };
  }
  var Il = Error(c(460)),
    $r = Error(c(474)),
    Qi = Error(c(542)),
    Ki = { then: function () {} };
  function df(e) {
    return ((e = e.status), e === 'fulfilled' || e === 'rejected');
  }
  function mf(e, t, a) {
    switch (
      ((a = e[a]),
      a === void 0 ? e.push(t) : a !== t && (t.then(ra, ra), (t = a)),
      t.status)
    ) {
      case 'fulfilled':
        return t.value;
      case 'rejected':
        throw ((e = t.reason), yf(e), e);
      default:
        if (typeof t.status == 'string') t.then(ra, ra);
        else {
          if (((e = qe), e !== null && 100 < e.shellSuspendCounter))
            throw Error(c(482));
          ((e = t),
            (e.status = 'pending'),
            e.then(
              function (l) {
                if (t.status === 'pending') {
                  var i = t;
                  ((i.status = 'fulfilled'), (i.value = l));
                }
              },
              function (l) {
                if (t.status === 'pending') {
                  var i = t;
                  ((i.status = 'rejected'), (i.reason = l));
                }
              },
            ));
        }
        switch (t.status) {
          case 'fulfilled':
            return t.value;
          case 'rejected':
            throw ((e = t.reason), yf(e), e);
        }
        throw ((vl = t), Il);
    }
  }
  function bl(e) {
    try {
      var t = e._init;
      return t(e._payload);
    } catch (a) {
      throw a !== null && typeof a == 'object' && typeof a.then == 'function'
        ? ((vl = a), Il)
        : a;
    }
  }
  var vl = null;
  function hf() {
    if (vl === null) throw Error(c(459));
    var e = vl;
    return ((vl = null), e);
  }
  function yf(e) {
    if (e === Il || e === Qi) throw Error(c(483));
  }
  var Pl = null,
    qn = 0;
  function Ji(e) {
    var t = qn;
    return ((qn += 1), Pl === null && (Pl = []), mf(Pl, e, t));
  }
  function Ln(e, t) {
    ((t = t.props.ref), (e.ref = t !== void 0 ? t : null));
  }
  function $i(e, t) {
    throw t.$$typeof === C
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
  function pf(e) {
    function t(N, j) {
      if (e) {
        var z = N.deletions;
        z === null ? ((N.deletions = [j]), (N.flags |= 16)) : z.push(j);
      }
    }
    function a(N, j) {
      if (!e) return null;
      for (; j !== null; ) (t(N, j), (j = j.sibling));
      return null;
    }
    function l(N) {
      for (var j = new Map(); N !== null; )
        (N.key !== null ? j.set(N.key, N) : j.set(N.index, N), (N = N.sibling));
      return j;
    }
    function i(N, j) {
      return ((N = ca(N, j)), (N.index = 0), (N.sibling = null), N);
    }
    function s(N, j, z) {
      return (
        (N.index = z),
        e
          ? ((z = N.alternate),
            z !== null
              ? ((z = z.index), z < j ? ((N.flags |= 67108866), j) : z)
              : ((N.flags |= 67108866), j))
          : ((N.flags |= 1048576), j)
      );
    }
    function o(N) {
      return (e && N.alternate === null && (N.flags |= 67108866), N);
    }
    function y(N, j, z, H) {
      return j === null || j.tag !== 6
        ? ((j = Br(z, N.mode, H)), (j.return = N), j)
        : ((j = i(j, z)), (j.return = N), j);
    }
    function E(N, j, z, H) {
      var de = z.type;
      return de === V
        ? k(N, j, z.props.children, H, z.key)
        : j !== null &&
            (j.elementType === de ||
              (typeof de == 'object' &&
                de !== null &&
                de.$$typeof === X &&
                bl(de) === j.type))
          ? ((j = i(j, z.props)), Ln(j, z), (j.return = N), j)
          : ((j = Yi(z.type, z.key, z.props, null, N.mode, H)),
            Ln(j, z),
            (j.return = N),
            j);
    }
    function _(N, j, z, H) {
      return j === null ||
        j.tag !== 4 ||
        j.stateNode.containerInfo !== z.containerInfo ||
        j.stateNode.implementation !== z.implementation
        ? ((j = Hr(z, N.mode, H)), (j.return = N), j)
        : ((j = i(j, z.children || [])), (j.return = N), j);
    }
    function k(N, j, z, H, de) {
      return j === null || j.tag !== 7
        ? ((j = ml(z, N.mode, H, de)), (j.return = N), j)
        : ((j = i(j, z)), (j.return = N), j);
    }
    function Y(N, j, z) {
      if (
        (typeof j == 'string' && j !== '') ||
        typeof j == 'number' ||
        typeof j == 'bigint'
      )
        return ((j = Br('' + j, N.mode, z)), (j.return = N), j);
      if (typeof j == 'object' && j !== null) {
        switch (j.$$typeof) {
          case Z:
            return (
              (z = Yi(j.type, j.key, j.props, null, N.mode, z)),
              Ln(z, j),
              (z.return = N),
              z
            );
          case G:
            return ((j = Hr(j, N.mode, z)), (j.return = N), j);
          case X:
            return ((j = bl(j)), Y(N, j, z));
        }
        if (P(j) || be(j))
          return ((j = ml(j, N.mode, z, null)), (j.return = N), j);
        if (typeof j.then == 'function') return Y(N, Ji(j), z);
        if (j.$$typeof === ae) return Y(N, Zi(N, j), z);
        $i(N, j);
      }
      return null;
    }
    function O(N, j, z, H) {
      var de = j !== null ? j.key : null;
      if (
        (typeof z == 'string' && z !== '') ||
        typeof z == 'number' ||
        typeof z == 'bigint'
      )
        return de !== null ? null : y(N, j, '' + z, H);
      if (typeof z == 'object' && z !== null) {
        switch (z.$$typeof) {
          case Z:
            return z.key === de ? E(N, j, z, H) : null;
          case G:
            return z.key === de ? _(N, j, z, H) : null;
          case X:
            return ((z = bl(z)), O(N, j, z, H));
        }
        if (P(z) || be(z)) return de !== null ? null : k(N, j, z, H, null);
        if (typeof z.then == 'function') return O(N, j, Ji(z), H);
        if (z.$$typeof === ae) return O(N, j, Zi(N, z), H);
        $i(N, z);
      }
      return null;
    }
    function D(N, j, z, H, de) {
      if (
        (typeof H == 'string' && H !== '') ||
        typeof H == 'number' ||
        typeof H == 'bigint'
      )
        return ((N = N.get(z) || null), y(j, N, '' + H, de));
      if (typeof H == 'object' && H !== null) {
        switch (H.$$typeof) {
          case Z:
            return (
              (N = N.get(H.key === null ? z : H.key) || null),
              E(j, N, H, de)
            );
          case G:
            return (
              (N = N.get(H.key === null ? z : H.key) || null),
              _(j, N, H, de)
            );
          case X:
            return ((H = bl(H)), D(N, j, z, H, de));
        }
        if (P(H) || be(H))
          return ((N = N.get(z) || null), k(j, N, H, de, null));
        if (typeof H.then == 'function') return D(N, j, z, Ji(H), de);
        if (H.$$typeof === ae) return D(N, j, z, Zi(j, H), de);
        $i(j, H);
      }
      return null;
    }
    function ie(N, j, z, H) {
      for (
        var de = null, _e = null, oe = j, xe = (j = 0), je = null;
        oe !== null && xe < z.length;
        xe++
      ) {
        oe.index > xe ? ((je = oe), (oe = null)) : (je = oe.sibling);
        var Ce = O(N, oe, z[xe], H);
        if (Ce === null) {
          oe === null && (oe = je);
          break;
        }
        (e && oe && Ce.alternate === null && t(N, oe),
          (j = s(Ce, j, xe)),
          _e === null ? (de = Ce) : (_e.sibling = Ce),
          (_e = Ce),
          (oe = je));
      }
      if (xe === z.length) return (a(N, oe), Ne && oa(N, xe), de);
      if (oe === null) {
        for (; xe < z.length; xe++)
          ((oe = Y(N, z[xe], H)),
            oe !== null &&
              ((j = s(oe, j, xe)),
              _e === null ? (de = oe) : (_e.sibling = oe),
              (_e = oe)));
        return (Ne && oa(N, xe), de);
      }
      for (oe = l(oe); xe < z.length; xe++)
        ((je = D(oe, N, xe, z[xe], H)),
          je !== null &&
            (e &&
              je.alternate !== null &&
              oe.delete(je.key === null ? xe : je.key),
            (j = s(je, j, xe)),
            _e === null ? (de = je) : (_e.sibling = je),
            (_e = je)));
      return (
        e &&
          oe.forEach(function (Pa) {
            return t(N, Pa);
          }),
        Ne && oa(N, xe),
        de
      );
    }
    function he(N, j, z, H) {
      if (z == null) throw Error(c(151));
      for (
        var de = null,
          _e = null,
          oe = j,
          xe = (j = 0),
          je = null,
          Ce = z.next();
        oe !== null && !Ce.done;
        xe++, Ce = z.next()
      ) {
        oe.index > xe ? ((je = oe), (oe = null)) : (je = oe.sibling);
        var Pa = O(N, oe, Ce.value, H);
        if (Pa === null) {
          oe === null && (oe = je);
          break;
        }
        (e && oe && Pa.alternate === null && t(N, oe),
          (j = s(Pa, j, xe)),
          _e === null ? (de = Pa) : (_e.sibling = Pa),
          (_e = Pa),
          (oe = je));
      }
      if (Ce.done) return (a(N, oe), Ne && oa(N, xe), de);
      if (oe === null) {
        for (; !Ce.done; xe++, Ce = z.next())
          ((Ce = Y(N, Ce.value, H)),
            Ce !== null &&
              ((j = s(Ce, j, xe)),
              _e === null ? (de = Ce) : (_e.sibling = Ce),
              (_e = Ce)));
        return (Ne && oa(N, xe), de);
      }
      for (oe = l(oe); !Ce.done; xe++, Ce = z.next())
        ((Ce = D(oe, N, xe, Ce.value, H)),
          Ce !== null &&
            (e &&
              Ce.alternate !== null &&
              oe.delete(Ce.key === null ? xe : Ce.key),
            (j = s(Ce, j, xe)),
            _e === null ? (de = Ce) : (_e.sibling = Ce),
            (_e = Ce)));
      return (
        e &&
          oe.forEach(function (Tb) {
            return t(N, Tb);
          }),
        Ne && oa(N, xe),
        de
      );
    }
    function He(N, j, z, H) {
      if (
        (typeof z == 'object' &&
          z !== null &&
          z.type === V &&
          z.key === null &&
          (z = z.props.children),
        typeof z == 'object' && z !== null)
      ) {
        switch (z.$$typeof) {
          case Z:
            e: {
              for (var de = z.key; j !== null; ) {
                if (j.key === de) {
                  if (((de = z.type), de === V)) {
                    if (j.tag === 7) {
                      (a(N, j.sibling),
                        (H = i(j, z.props.children)),
                        (H.return = N),
                        (N = H));
                      break e;
                    }
                  } else if (
                    j.elementType === de ||
                    (typeof de == 'object' &&
                      de !== null &&
                      de.$$typeof === X &&
                      bl(de) === j.type)
                  ) {
                    (a(N, j.sibling),
                      (H = i(j, z.props)),
                      Ln(H, z),
                      (H.return = N),
                      (N = H));
                    break e;
                  }
                  a(N, j);
                  break;
                } else t(N, j);
                j = j.sibling;
              }
              z.type === V
                ? ((H = ml(z.props.children, N.mode, H, z.key)),
                  (H.return = N),
                  (N = H))
                : ((H = Yi(z.type, z.key, z.props, null, N.mode, H)),
                  Ln(H, z),
                  (H.return = N),
                  (N = H));
            }
            return o(N);
          case G:
            e: {
              for (de = z.key; j !== null; ) {
                if (j.key === de)
                  if (
                    j.tag === 4 &&
                    j.stateNode.containerInfo === z.containerInfo &&
                    j.stateNode.implementation === z.implementation
                  ) {
                    (a(N, j.sibling),
                      (H = i(j, z.children || [])),
                      (H.return = N),
                      (N = H));
                    break e;
                  } else {
                    a(N, j);
                    break;
                  }
                else t(N, j);
                j = j.sibling;
              }
              ((H = Hr(z, N.mode, H)), (H.return = N), (N = H));
            }
            return o(N);
          case X:
            return ((z = bl(z)), He(N, j, z, H));
        }
        if (P(z)) return ie(N, j, z, H);
        if (be(z)) {
          if (((de = be(z)), typeof de != 'function')) throw Error(c(150));
          return ((z = de.call(z)), he(N, j, z, H));
        }
        if (typeof z.then == 'function') return He(N, j, Ji(z), H);
        if (z.$$typeof === ae) return He(N, j, Zi(N, z), H);
        $i(N, z);
      }
      return (typeof z == 'string' && z !== '') ||
        typeof z == 'number' ||
        typeof z == 'bigint'
        ? ((z = '' + z),
          j !== null && j.tag === 6
            ? (a(N, j.sibling), (H = i(j, z)), (H.return = N), (N = H))
            : (a(N, j), (H = Br(z, N.mode, H)), (H.return = N), (N = H)),
          o(N))
        : a(N, j);
    }
    return function (N, j, z, H) {
      try {
        qn = 0;
        var de = He(N, j, z, H);
        return ((Pl = null), de);
      } catch (oe) {
        if (oe === Il || oe === Qi) throw oe;
        var _e = Rt(29, oe, null, N.mode);
        return ((_e.lanes = H), (_e.return = N), _e);
      } finally {
      }
    };
  }
  var xl = pf(!0),
    gf = pf(!1),
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
  function Ba(e) {
    return { lane: e, tag: 0, payload: null, callback: null, next: null };
  }
  function Ha(e, t, a) {
    var l = e.updateQueue;
    if (l === null) return null;
    if (((l = l.shared), (Oe & 2) !== 0)) {
      var i = l.pending;
      return (
        i === null ? (t.next = t) : ((t.next = i.next), (i.next = t)),
        (l.pending = t),
        (t = Li(e)),
        Po(e, null, a),
        t
      );
    }
    return (qi(e, l, t, a), Li(e));
  }
  function Yn(e, t, a) {
    if (
      ((t = t.updateQueue), t !== null && ((t = t.shared), (a & 4194048) !== 0))
    ) {
      var l = t.lanes;
      ((l &= e.pendingLanes), (a |= l), (t.lanes = a), so(e, a));
    }
  }
  function Ir(e, t) {
    var a = e.updateQueue,
      l = e.alternate;
    if (l !== null && ((l = l.updateQueue), a === l)) {
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
        baseState: l.baseState,
        firstBaseUpdate: i,
        lastBaseUpdate: s,
        shared: l.shared,
        callbacks: l.callbacks,
      }),
        (e.updateQueue = a));
      return;
    }
    ((e = a.lastBaseUpdate),
      e === null ? (a.firstBaseUpdate = t) : (e.next = t),
      (a.lastBaseUpdate = t));
  }
  var Pr = !1;
  function Gn() {
    if (Pr) {
      var e = Fl;
      if (e !== null) throw e;
    }
  }
  function Xn(e, t, a, l) {
    Pr = !1;
    var i = e.updateQueue;
    ka = !1;
    var s = i.firstBaseUpdate,
      o = i.lastBaseUpdate,
      y = i.shared.pending;
    if (y !== null) {
      i.shared.pending = null;
      var E = y,
        _ = E.next;
      ((E.next = null), o === null ? (s = _) : (o.next = _), (o = E));
      var k = e.alternate;
      k !== null &&
        ((k = k.updateQueue),
        (y = k.lastBaseUpdate),
        y !== o &&
          (y === null ? (k.firstBaseUpdate = _) : (y.next = _),
          (k.lastBaseUpdate = E)));
    }
    if (s !== null) {
      var Y = i.baseState;
      ((o = 0), (k = _ = E = null), (y = s));
      do {
        var O = y.lane & -536870913,
          D = O !== y.lane;
        if (D ? (we & O) === O : (l & O) === O) {
          (O !== 0 && O === Wl && (Pr = !0),
            k !== null &&
              (k = k.next =
                {
                  lane: 0,
                  tag: y.tag,
                  payload: y.payload,
                  callback: null,
                  next: null,
                }));
          e: {
            var ie = e,
              he = y;
            O = t;
            var He = a;
            switch (he.tag) {
              case 1:
                if (((ie = he.payload), typeof ie == 'function')) {
                  Y = ie.call(He, Y, O);
                  break e;
                }
                Y = ie;
                break e;
              case 3:
                ie.flags = (ie.flags & -65537) | 128;
              case 0:
                if (
                  ((ie = he.payload),
                  (O = typeof ie == 'function' ? ie.call(He, Y, O) : ie),
                  O == null)
                )
                  break e;
                Y = x({}, Y, O);
                break e;
              case 2:
                ka = !0;
            }
          }
          ((O = y.callback),
            O !== null &&
              ((e.flags |= 64),
              D && (e.flags |= 8192),
              (D = i.callbacks),
              D === null ? (i.callbacks = [O]) : D.push(O)));
        } else
          ((D = {
            lane: O,
            tag: y.tag,
            payload: y.payload,
            callback: y.callback,
            next: null,
          }),
            k === null ? ((_ = k = D), (E = Y)) : (k = k.next = D),
            (o |= O));
        if (((y = y.next), y === null)) {
          if (((y = i.shared.pending), y === null)) break;
          ((D = y),
            (y = D.next),
            (D.next = null),
            (i.lastBaseUpdate = D),
            (i.shared.pending = null));
        }
      } while (!0);
      (k === null && (E = Y),
        (i.baseState = E),
        (i.firstBaseUpdate = _),
        (i.lastBaseUpdate = k),
        s === null && (i.shared.lanes = 0),
        (Xa |= o),
        (e.lanes = o),
        (e.memoizedState = Y));
    }
  }
  function bf(e, t) {
    if (typeof e != 'function') throw Error(c(191, e));
    e.call(t);
  }
  function vf(e, t) {
    var a = e.callbacks;
    if (a !== null)
      for (e.callbacks = null, e = 0; e < a.length; e++) bf(a[e], t);
  }
  var en = w(null),
    Wi = w(0);
  function xf(e, t) {
    ((e = Sa), T(Wi, e), T(en, t), (Sa = e | t.baseLanes));
  }
  function eu() {
    (T(Wi, Sa), T(en, en.current));
  }
  function tu() {
    ((Sa = Wi.current), g(en), g(Wi));
  }
  var zt = w(null),
    Gt = null;
  function qa(e) {
    var t = e.alternate;
    (T(We, We.current & 1),
      T(zt, e),
      Gt === null &&
        (t === null || en.current !== null || t.memoizedState !== null) &&
        (Gt = e));
  }
  function au(e) {
    (T(We, We.current), T(zt, e), Gt === null && (Gt = e));
  }
  function Sf(e) {
    e.tag === 22
      ? (T(We, We.current), T(zt, e), Gt === null && (Gt = e))
      : La();
  }
  function La() {
    (T(We, We.current), T(zt, zt.current));
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
  var ma = 0,
    ve = null,
    ke = null,
    Pe = null,
    Ii = !1,
    tn = !1,
    Sl = !1,
    Pi = 0,
    Zn = 0,
    an = null,
    mg = 0;
  function Je() {
    throw Error(c(321));
  }
  function lu(e, t) {
    if (t === null) return !1;
    for (var a = 0; a < t.length && a < e.length; a++)
      if (!Nt(e[a], t[a])) return !1;
    return !0;
  }
  function nu(e, t, a, l, i, s) {
    return (
      (ma = s),
      (ve = t),
      (t.memoizedState = null),
      (t.updateQueue = null),
      (t.lanes = 0),
      (R.H = e === null || e.memoizedState === null ? nd : vu),
      (Sl = !1),
      (s = a(l, i)),
      (Sl = !1),
      tn && (s = Tf(t, a, l, i)),
      Ef(e),
      s
    );
  }
  function Ef(e) {
    R.H = Kn;
    var t = ke !== null && ke.next !== null;
    if (((ma = 0), (Pe = ke = ve = null), (Ii = !1), (Zn = 0), (an = null), t))
      throw Error(c(300));
    e === null ||
      et ||
      ((e = e.dependencies), e !== null && Xi(e) && (et = !0));
  }
  function Tf(e, t, a, l) {
    ve = e;
    var i = 0;
    do {
      if ((tn && (an = null), (Zn = 0), (tn = !1), 25 <= i))
        throw Error(c(301));
      if (((i += 1), (Pe = ke = null), e.updateQueue != null)) {
        var s = e.updateQueue;
        ((s.lastEffect = null),
          (s.events = null),
          (s.stores = null),
          s.memoCache != null && (s.memoCache.index = 0));
      }
      ((R.H = id), (s = t(a, l)));
    } while (tn);
    return s;
  }
  function hg() {
    var e = R.H,
      t = e.useState()[0];
    return (
      (t = typeof t.then == 'function' ? Vn(t) : t),
      (e = e.useState()[0]),
      (ke !== null ? ke.memoizedState : null) !== e && (ve.flags |= 1024),
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
    ((ma = 0), (Pe = ke = ve = null), (tn = !1), (Zn = Pi = 0), (an = null));
  }
  function pt() {
    var e = {
      memoizedState: null,
      baseState: null,
      baseQueue: null,
      queue: null,
      next: null,
    };
    return (Pe === null ? (ve.memoizedState = Pe = e) : (Pe = Pe.next = e), Pe);
  }
  function Fe() {
    if (ke === null) {
      var e = ve.alternate;
      e = e !== null ? e.memoizedState : null;
    } else e = ke.next;
    var t = Pe === null ? ve.memoizedState : Pe.next;
    if (t !== null) ((Pe = t), (ke = e));
    else {
      if (e === null)
        throw ve.alternate === null ? Error(c(467)) : Error(c(310));
      ((ke = e),
        (e = {
          memoizedState: ke.memoizedState,
          baseState: ke.baseState,
          baseQueue: ke.baseQueue,
          queue: ke.queue,
          next: null,
        }),
        Pe === null ? (ve.memoizedState = Pe = e) : (Pe = Pe.next = e));
    }
    return Pe;
  }
  function es() {
    return { lastEffect: null, events: null, stores: null, memoCache: null };
  }
  function Vn(e) {
    var t = Zn;
    return (
      (Zn += 1),
      an === null && (an = []),
      (e = mf(an, e, t)),
      (t = ve),
      (Pe === null ? t.memoizedState : Pe.next) === null &&
        ((t = t.alternate),
        (R.H = t === null || t.memoizedState === null ? nd : vu)),
      e
    );
  }
  function ts(e) {
    if (e !== null && typeof e == 'object') {
      if (typeof e.then == 'function') return Vn(e);
      if (e.$$typeof === ae) return ft(e);
    }
    throw Error(c(438, String(e)));
  }
  function uu(e) {
    var t = null,
      a = ve.updateQueue;
    if ((a !== null && (t = a.memoCache), t == null)) {
      var l = ve.alternate;
      l !== null &&
        ((l = l.updateQueue),
        l !== null &&
          ((l = l.memoCache),
          l != null &&
            (t = {
              data: l.data.map(function (i) {
                return i.slice();
              }),
              index: 0,
            })));
    }
    if (
      (t == null && (t = { data: [], index: 0 }),
      a === null && ((a = es()), (ve.updateQueue = a)),
      (a.memoCache = t),
      (a = t.data[t.index]),
      a === void 0)
    )
      for (a = t.data[t.index] = Array(e), l = 0; l < e; l++) a[l] = Ye;
    return (t.index++, a);
  }
  function ha(e, t) {
    return typeof t == 'function' ? t(e) : t;
  }
  function as(e) {
    var t = Fe();
    return cu(t, ke, e);
  }
  function cu(e, t, a) {
    var l = e.queue;
    if (l === null) throw Error(c(311));
    l.lastRenderedReducer = a;
    var i = e.baseQueue,
      s = l.pending;
    if (s !== null) {
      if (i !== null) {
        var o = i.next;
        ((i.next = s.next), (s.next = o));
      }
      ((t.baseQueue = i = s), (l.pending = null));
    }
    if (((s = e.baseState), i === null)) e.memoizedState = s;
    else {
      t = i.next;
      var y = (o = null),
        E = null,
        _ = t,
        k = !1;
      do {
        var Y = _.lane & -536870913;
        if (Y !== _.lane ? (we & Y) === Y : (ma & Y) === Y) {
          var O = _.revertLane;
          if (O === 0)
            (E !== null &&
              (E = E.next =
                {
                  lane: 0,
                  revertLane: 0,
                  gesture: null,
                  action: _.action,
                  hasEagerState: _.hasEagerState,
                  eagerState: _.eagerState,
                  next: null,
                }),
              Y === Wl && (k = !0));
          else if ((ma & O) === O) {
            ((_ = _.next), O === Wl && (k = !0));
            continue;
          } else
            ((Y = {
              lane: 0,
              revertLane: _.revertLane,
              gesture: null,
              action: _.action,
              hasEagerState: _.hasEagerState,
              eagerState: _.eagerState,
              next: null,
            }),
              E === null ? ((y = E = Y), (o = s)) : (E = E.next = Y),
              (ve.lanes |= O),
              (Xa |= O));
          ((Y = _.action),
            Sl && a(s, Y),
            (s = _.hasEagerState ? _.eagerState : a(s, Y)));
        } else
          ((O = {
            lane: Y,
            revertLane: _.revertLane,
            gesture: _.gesture,
            action: _.action,
            hasEagerState: _.hasEagerState,
            eagerState: _.eagerState,
            next: null,
          }),
            E === null ? ((y = E = O), (o = s)) : (E = E.next = O),
            (ve.lanes |= Y),
            (Xa |= Y));
        _ = _.next;
      } while (_ !== null && _ !== t);
      if (
        (E === null ? (o = s) : (E.next = y),
        !Nt(s, e.memoizedState) && ((et = !0), k && ((a = Fl), a !== null)))
      )
        throw a;
      ((e.memoizedState = s),
        (e.baseState = o),
        (e.baseQueue = E),
        (l.lastRenderedState = s));
    }
    return (i === null && (l.lanes = 0), [e.memoizedState, l.dispatch]);
  }
  function ou(e) {
    var t = Fe(),
      a = t.queue;
    if (a === null) throw Error(c(311));
    a.lastRenderedReducer = e;
    var l = a.dispatch,
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
    return [s, l];
  }
  function Af(e, t, a) {
    var l = ve,
      i = Fe(),
      s = Ne;
    if (s) {
      if (a === void 0) throw Error(c(407));
      a = a();
    } else a = t();
    var o = !Nt((ke || i).memoizedState, a);
    if (
      (o && ((i.memoizedState = a), (et = !0)),
      (i = i.queue),
      mu(Nf.bind(null, l, i, e), [e]),
      i.getSnapshot !== t || o || (Pe !== null && Pe.memoizedState.tag & 1))
    ) {
      if (
        ((l.flags |= 2048),
        ln(9, { destroy: void 0 }, jf.bind(null, l, i, a, t), null),
        qe === null)
      )
        throw Error(c(349));
      s || (ma & 127) !== 0 || wf(l, t, a);
    }
    return a;
  }
  function wf(e, t, a) {
    ((e.flags |= 16384),
      (e = { getSnapshot: t, value: a }),
      (t = ve.updateQueue),
      t === null
        ? ((t = es()), (ve.updateQueue = t), (t.stores = [e]))
        : ((a = t.stores), a === null ? (t.stores = [e]) : a.push(e)));
  }
  function jf(e, t, a, l) {
    ((t.value = a), (t.getSnapshot = l), Rf(t) && zf(e));
  }
  function Nf(e, t, a) {
    return a(function () {
      Rf(t) && zf(e);
    });
  }
  function Rf(e) {
    var t = e.getSnapshot;
    e = e.value;
    try {
      var a = t();
      return !Nt(e, a);
    } catch {
      return !0;
    }
  }
  function zf(e) {
    var t = dl(e, 2);
    t !== null && Tt(t, e, 2);
  }
  function fu(e) {
    var t = pt();
    if (typeof e == 'function') {
      var a = e;
      if (((e = a()), Sl)) {
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
        lastRenderedReducer: ha,
        lastRenderedState: e,
      }),
      t
    );
  }
  function _f(e, t, a, l) {
    return ((e.baseState = a), cu(e, ke, typeof l == 'function' ? l : ha));
  }
  function yg(e, t, a, l, i) {
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
      (R.T !== null ? a(!0) : (s.isTransition = !1),
        l(s),
        (a = t.pending),
        a === null
          ? ((s.next = t.pending = s), Cf(t, s))
          : ((s.next = a.next), (t.pending = a.next = s)));
    }
  }
  function Cf(e, t) {
    var a = t.action,
      l = t.payload,
      i = e.state;
    if (t.isTransition) {
      var s = R.T,
        o = {};
      R.T = o;
      try {
        var y = a(i, l),
          E = R.S;
        (E !== null && E(o, y), Of(e, t, y));
      } catch (_) {
        du(e, t, _);
      } finally {
        (s !== null && o.types !== null && (s.types = o.types), (R.T = s));
      }
    } else
      try {
        ((s = a(i, l)), Of(e, t, s));
      } catch (_) {
        du(e, t, _);
      }
  }
  function Of(e, t, a) {
    a !== null && typeof a == 'object' && typeof a.then == 'function'
      ? a.then(
          function (l) {
            Mf(e, t, l);
          },
          function (l) {
            return du(e, t, l);
          },
        )
      : Mf(e, t, a);
  }
  function Mf(e, t, a) {
    ((t.status = 'fulfilled'),
      (t.value = a),
      Df(t),
      (e.state = a),
      (t = e.pending),
      t !== null &&
        ((a = t.next),
        a === t ? (e.pending = null) : ((a = a.next), (t.next = a), Cf(e, a))));
  }
  function du(e, t, a) {
    var l = e.pending;
    if (((e.pending = null), l !== null)) {
      l = l.next;
      do ((t.status = 'rejected'), (t.reason = a), Df(t), (t = t.next));
      while (t !== l);
    }
    e.action = null;
  }
  function Df(e) {
    e = e.listeners;
    for (var t = 0; t < e.length; t++) (0, e[t])();
  }
  function Uf(e, t) {
    return t;
  }
  function kf(e, t) {
    if (Ne) {
      var a = qe.formState;
      if (a !== null) {
        e: {
          var l = ve;
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
                ((Ge = Xt(i.nextSibling)), (l = i.data === 'F!'));
                break e;
              }
            }
            Da(l);
          }
          l = !1;
        }
        l && (t = a[0]);
      }
    }
    return (
      (a = pt()),
      (a.memoizedState = a.baseState = t),
      (l = {
        pending: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: Uf,
        lastRenderedState: t,
      }),
      (a.queue = l),
      (a = td.bind(null, ve, l)),
      (l.dispatch = a),
      (l = fu(!1)),
      (s = bu.bind(null, ve, !1, l.queue)),
      (l = pt()),
      (i = { state: t, dispatch: null, action: e, pending: null }),
      (l.queue = i),
      (a = yg.bind(null, ve, i, s, a)),
      (i.dispatch = a),
      (l.memoizedState = e),
      [t, a, !1]
    );
  }
  function Bf(e) {
    var t = Fe();
    return Hf(t, ke, e);
  }
  function Hf(e, t, a) {
    if (
      ((t = cu(e, t, Uf)[0]),
      (e = as(ha)[0]),
      typeof t == 'object' && t !== null && typeof t.then == 'function')
    )
      try {
        var l = Vn(t);
      } catch (o) {
        throw o === Il ? Qi : o;
      }
    else l = t;
    t = Fe();
    var i = t.queue,
      s = i.dispatch;
    return (
      a !== t.memoizedState &&
        ((ve.flags |= 2048),
        ln(9, { destroy: void 0 }, pg.bind(null, i, a), null)),
      [l, s, e]
    );
  }
  function pg(e, t) {
    e.action = t;
  }
  function qf(e) {
    var t = Fe(),
      a = ke;
    if (a !== null) return Hf(t, a, e);
    (Fe(), (t = t.memoizedState), (a = Fe()));
    var l = a.queue.dispatch;
    return ((a.memoizedState = e), [t, l, !1]);
  }
  function ln(e, t, a, l) {
    return (
      (e = { tag: e, create: a, deps: l, inst: t, next: null }),
      (t = ve.updateQueue),
      t === null && ((t = es()), (ve.updateQueue = t)),
      (a = t.lastEffect),
      a === null
        ? (t.lastEffect = e.next = e)
        : ((l = a.next), (a.next = e), (e.next = l), (t.lastEffect = e)),
      e
    );
  }
  function Lf() {
    return Fe().memoizedState;
  }
  function ls(e, t, a, l) {
    var i = pt();
    ((ve.flags |= e),
      (i.memoizedState = ln(
        1 | t,
        { destroy: void 0 },
        a,
        l === void 0 ? null : l,
      )));
  }
  function ns(e, t, a, l) {
    var i = Fe();
    l = l === void 0 ? null : l;
    var s = i.memoizedState.inst;
    ke !== null && l !== null && lu(l, ke.memoizedState.deps)
      ? (i.memoizedState = ln(t, s, a, l))
      : ((ve.flags |= e), (i.memoizedState = ln(1 | t, s, a, l)));
  }
  function Yf(e, t) {
    ls(8390656, 8, e, t);
  }
  function mu(e, t) {
    ns(2048, 8, e, t);
  }
  function gg(e) {
    ve.flags |= 4;
    var t = ve.updateQueue;
    if (t === null) ((t = es()), (ve.updateQueue = t), (t.events = [e]));
    else {
      var a = t.events;
      a === null ? (t.events = [e]) : a.push(e);
    }
  }
  function Gf(e) {
    var t = Fe().memoizedState;
    return (
      gg({ ref: t, nextImpl: e }),
      function () {
        if ((Oe & 2) !== 0) throw Error(c(440));
        return t.impl.apply(void 0, arguments);
      }
    );
  }
  function Xf(e, t) {
    return ns(4, 2, e, t);
  }
  function Zf(e, t) {
    return ns(4, 4, e, t);
  }
  function Vf(e, t) {
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
  function Qf(e, t, a) {
    ((a = a != null ? a.concat([e]) : null), ns(4, 4, Vf.bind(null, t, e), a));
  }
  function hu() {}
  function Kf(e, t) {
    var a = Fe();
    t = t === void 0 ? null : t;
    var l = a.memoizedState;
    return t !== null && lu(t, l[1]) ? l[0] : ((a.memoizedState = [e, t]), e);
  }
  function Jf(e, t) {
    var a = Fe();
    t = t === void 0 ? null : t;
    var l = a.memoizedState;
    if (t !== null && lu(t, l[1])) return l[0];
    if (((l = e()), Sl)) {
      za(!0);
      try {
        e();
      } finally {
        za(!1);
      }
    }
    return ((a.memoizedState = [l, t]), l);
  }
  function yu(e, t, a) {
    return a === void 0 || ((ma & 1073741824) !== 0 && (we & 261930) === 0)
      ? (e.memoizedState = t)
      : ((e.memoizedState = a), (e = $d()), (ve.lanes |= e), (Xa |= e), a);
  }
  function $f(e, t, a, l) {
    return Nt(a, t)
      ? a
      : en.current !== null
        ? ((e = yu(e, a, l)), Nt(e, t) || (et = !0), e)
        : (ma & 42) === 0 || ((ma & 1073741824) !== 0 && (we & 261930) === 0)
          ? ((et = !0), (e.memoizedState = a))
          : ((e = $d()), (ve.lanes |= e), (Xa |= e), t);
  }
  function Wf(e, t, a, l, i) {
    var s = q.p;
    q.p = s !== 0 && 8 > s ? s : 8;
    var o = R.T,
      y = {};
    ((R.T = y), bu(e, !1, t, a));
    try {
      var E = i(),
        _ = R.S;
      if (
        (_ !== null && _(y, E),
        E !== null && typeof E == 'object' && typeof E.then == 'function')
      ) {
        var k = dg(E, l);
        Qn(e, t, k, Mt(e));
      } else Qn(e, t, l, Mt(e));
    } catch (Y) {
      Qn(e, t, { then: function () {}, status: 'rejected', reason: Y }, Mt());
    } finally {
      ((q.p = s),
        o !== null && y.types !== null && (o.types = y.types),
        (R.T = o));
    }
  }
  function bg() {}
  function pu(e, t, a, l) {
    if (e.tag !== 5) throw Error(c(476));
    var i = Ff(e).queue;
    Wf(
      e,
      i,
      t,
      se,
      a === null
        ? bg
        : function () {
            return (If(e), a(l));
          },
    );
  }
  function Ff(e) {
    var t = e.memoizedState;
    if (t !== null) return t;
    t = {
      memoizedState: se,
      baseState: se,
      baseQueue: null,
      queue: {
        pending: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: ha,
        lastRenderedState: se,
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
          lastRenderedReducer: ha,
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
  function If(e) {
    var t = Ff(e);
    (t.next === null && (t = e.alternate.memoizedState),
      Qn(e, t.next.queue, {}, Mt()));
  }
  function gu() {
    return ft(ci);
  }
  function Pf() {
    return Fe().memoizedState;
  }
  function ed() {
    return Fe().memoizedState;
  }
  function vg(e) {
    for (var t = e.return; t !== null; ) {
      switch (t.tag) {
        case 24:
        case 3:
          var a = Mt();
          e = Ba(a);
          var l = Ha(t, e, a);
          (l !== null && (Tt(l, t, a), Yn(l, t, a)),
            (t = { cache: Qr() }),
            (e.payload = t));
          return;
      }
      t = t.return;
    }
  }
  function xg(e, t, a) {
    var l = Mt();
    ((a = {
      lane: l,
      revertLane: 0,
      gesture: null,
      action: a,
      hasEagerState: !1,
      eagerState: null,
      next: null,
    }),
      is(e)
        ? ad(t, a)
        : ((a = Ur(e, t, a, l)), a !== null && (Tt(a, e, l), ld(a, t, l))));
  }
  function td(e, t, a) {
    var l = Mt();
    Qn(e, t, a, l);
  }
  function Qn(e, t, a, l) {
    var i = {
      lane: l,
      revertLane: 0,
      gesture: null,
      action: a,
      hasEagerState: !1,
      eagerState: null,
      next: null,
    };
    if (is(e)) ad(t, i);
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
            return (qi(e, t, i, 0), qe === null && Hi(), !1);
        } catch {
        } finally {
        }
      if (((a = Ur(e, t, i, l)), a !== null))
        return (Tt(a, e, l), ld(a, t, l), !0);
    }
    return !1;
  }
  function bu(e, t, a, l) {
    if (
      ((l = {
        lane: 2,
        revertLane: Wu(),
        gesture: null,
        action: l,
        hasEagerState: !1,
        eagerState: null,
        next: null,
      }),
      is(e))
    ) {
      if (t) throw Error(c(479));
    } else ((t = Ur(e, a, l, 2)), t !== null && Tt(t, e, 2));
  }
  function is(e) {
    var t = e.alternate;
    return e === ve || (t !== null && t === ve);
  }
  function ad(e, t) {
    tn = Ii = !0;
    var a = e.pending;
    (a === null ? (t.next = t) : ((t.next = a.next), (a.next = t)),
      (e.pending = t));
  }
  function ld(e, t, a) {
    if ((a & 4194048) !== 0) {
      var l = t.lanes;
      ((l &= e.pendingLanes), (a |= l), (t.lanes = a), so(e, a));
    }
  }
  var Kn = {
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
  Kn.useEffectEvent = Je;
  var nd = {
      readContext: ft,
      use: ts,
      useCallback: function (e, t) {
        return ((pt().memoizedState = [e, t === void 0 ? null : t]), e);
      },
      useContext: ft,
      useEffect: Yf,
      useImperativeHandle: function (e, t, a) {
        ((a = a != null ? a.concat([e]) : null),
          ls(4194308, 4, Vf.bind(null, t, e), a));
      },
      useLayoutEffect: function (e, t) {
        return ls(4194308, 4, e, t);
      },
      useInsertionEffect: function (e, t) {
        ls(4, 2, e, t);
      },
      useMemo: function (e, t) {
        var a = pt();
        t = t === void 0 ? null : t;
        var l = e();
        if (Sl) {
          za(!0);
          try {
            e();
          } finally {
            za(!1);
          }
        }
        return ((a.memoizedState = [l, t]), l);
      },
      useReducer: function (e, t, a) {
        var l = pt();
        if (a !== void 0) {
          var i = a(t);
          if (Sl) {
            za(!0);
            try {
              a(t);
            } finally {
              za(!1);
            }
          }
        } else i = t;
        return (
          (l.memoizedState = l.baseState = i),
          (e = {
            pending: null,
            lanes: 0,
            dispatch: null,
            lastRenderedReducer: e,
            lastRenderedState: i,
          }),
          (l.queue = e),
          (e = e.dispatch = xg.bind(null, ve, e)),
          [l.memoizedState, e]
        );
      },
      useRef: function (e) {
        var t = pt();
        return ((e = { current: e }), (t.memoizedState = e));
      },
      useState: function (e) {
        e = fu(e);
        var t = e.queue,
          a = td.bind(null, ve, t);
        return ((t.dispatch = a), [e.memoizedState, a]);
      },
      useDebugValue: hu,
      useDeferredValue: function (e, t) {
        var a = pt();
        return yu(a, e, t);
      },
      useTransition: function () {
        var e = fu(!1);
        return (
          (e = Wf.bind(null, ve, e.queue, !0, !1)),
          (pt().memoizedState = e),
          [!1, e]
        );
      },
      useSyncExternalStore: function (e, t, a) {
        var l = ve,
          i = pt();
        if (Ne) {
          if (a === void 0) throw Error(c(407));
          a = a();
        } else {
          if (((a = t()), qe === null)) throw Error(c(349));
          (we & 127) !== 0 || wf(l, t, a);
        }
        i.memoizedState = a;
        var s = { value: a, getSnapshot: t };
        return (
          (i.queue = s),
          Yf(Nf.bind(null, l, s, e), [e]),
          (l.flags |= 2048),
          ln(9, { destroy: void 0 }, jf.bind(null, l, s, a, t), null),
          a
        );
      },
      useId: function () {
        var e = pt(),
          t = qe.identifierPrefix;
        if (Ne) {
          var a = Ft,
            l = Wt;
          ((a = (l & ~(1 << (32 - jt(l) - 1))).toString(32) + a),
            (t = '_' + t + 'R_' + a),
            (a = Pi++),
            0 < a && (t += 'H' + a.toString(32)),
            (t += '_'));
        } else ((a = mg++), (t = '_' + t + 'r_' + a.toString(32) + '_'));
        return (e.memoizedState = t);
      },
      useHostTransitionStatus: gu,
      useFormState: kf,
      useActionState: kf,
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
          (t = bu.bind(null, ve, !0, a)),
          (a.dispatch = t),
          [e, t]
        );
      },
      useMemoCache: uu,
      useCacheRefresh: function () {
        return (pt().memoizedState = vg.bind(null, ve));
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
      useCallback: Kf,
      useContext: ft,
      useEffect: mu,
      useImperativeHandle: Qf,
      useInsertionEffect: Xf,
      useLayoutEffect: Zf,
      useMemo: Jf,
      useReducer: as,
      useRef: Lf,
      useState: function () {
        return as(ha);
      },
      useDebugValue: hu,
      useDeferredValue: function (e, t) {
        var a = Fe();
        return $f(a, ke.memoizedState, e, t);
      },
      useTransition: function () {
        var e = as(ha)[0],
          t = Fe().memoizedState;
        return [typeof e == 'boolean' ? e : Vn(e), t];
      },
      useSyncExternalStore: Af,
      useId: Pf,
      useHostTransitionStatus: gu,
      useFormState: Bf,
      useActionState: Bf,
      useOptimistic: function (e, t) {
        var a = Fe();
        return _f(a, ke, e, t);
      },
      useMemoCache: uu,
      useCacheRefresh: ed,
    };
  vu.useEffectEvent = Gf;
  var id = {
    readContext: ft,
    use: ts,
    useCallback: Kf,
    useContext: ft,
    useEffect: mu,
    useImperativeHandle: Qf,
    useInsertionEffect: Xf,
    useLayoutEffect: Zf,
    useMemo: Jf,
    useReducer: ou,
    useRef: Lf,
    useState: function () {
      return ou(ha);
    },
    useDebugValue: hu,
    useDeferredValue: function (e, t) {
      var a = Fe();
      return ke === null ? yu(a, e, t) : $f(a, ke.memoizedState, e, t);
    },
    useTransition: function () {
      var e = ou(ha)[0],
        t = Fe().memoizedState;
      return [typeof e == 'boolean' ? e : Vn(e), t];
    },
    useSyncExternalStore: Af,
    useId: Pf,
    useHostTransitionStatus: gu,
    useFormState: qf,
    useActionState: qf,
    useOptimistic: function (e, t) {
      var a = Fe();
      return ke !== null
        ? _f(a, ke, e, t)
        : ((a.baseState = e), [e, a.queue.dispatch]);
    },
    useMemoCache: uu,
    useCacheRefresh: ed,
  };
  id.useEffectEvent = Gf;
  function xu(e, t, a, l) {
    ((t = e.memoizedState),
      (a = a(l, t)),
      (a = a == null ? t : x({}, t, a)),
      (e.memoizedState = a),
      e.lanes === 0 && (e.updateQueue.baseState = a));
  }
  var Su = {
    enqueueSetState: function (e, t, a) {
      e = e._reactInternals;
      var l = Mt(),
        i = Ba(l);
      ((i.payload = t),
        a != null && (i.callback = a),
        (t = Ha(e, i, l)),
        t !== null && (Tt(t, e, l), Yn(t, e, l)));
    },
    enqueueReplaceState: function (e, t, a) {
      e = e._reactInternals;
      var l = Mt(),
        i = Ba(l);
      ((i.tag = 1),
        (i.payload = t),
        a != null && (i.callback = a),
        (t = Ha(e, i, l)),
        t !== null && (Tt(t, e, l), Yn(t, e, l)));
    },
    enqueueForceUpdate: function (e, t) {
      e = e._reactInternals;
      var a = Mt(),
        l = Ba(a);
      ((l.tag = 2),
        t != null && (l.callback = t),
        (t = Ha(e, l, a)),
        t !== null && (Tt(t, e, a), Yn(t, e, a)));
    },
  };
  function sd(e, t, a, l, i, s, o) {
    return (
      (e = e.stateNode),
      typeof e.shouldComponentUpdate == 'function'
        ? e.shouldComponentUpdate(l, s, o)
        : t.prototype && t.prototype.isPureReactComponent
          ? !Mn(a, l) || !Mn(i, s)
          : !0
    );
  }
  function rd(e, t, a, l) {
    ((e = t.state),
      typeof t.componentWillReceiveProps == 'function' &&
        t.componentWillReceiveProps(a, l),
      typeof t.UNSAFE_componentWillReceiveProps == 'function' &&
        t.UNSAFE_componentWillReceiveProps(a, l),
      t.state !== e && Su.enqueueReplaceState(t, t.state, null));
  }
  function El(e, t) {
    var a = t;
    if ('ref' in t) {
      a = {};
      for (var l in t) l !== 'ref' && (a[l] = t[l]);
    }
    if ((e = e.defaultProps)) {
      a === t && (a = x({}, a));
      for (var i in e) a[i] === void 0 && (a[i] = e[i]);
    }
    return a;
  }
  function ud(e) {
    Bi(e);
  }
  function cd(e) {
    console.error(e);
  }
  function od(e) {
    Bi(e);
  }
  function ss(e, t) {
    try {
      var a = e.onUncaughtError;
      a(t.value, { componentStack: t.stack });
    } catch (l) {
      setTimeout(function () {
        throw l;
      });
    }
  }
  function fd(e, t, a) {
    try {
      var l = e.onCaughtError;
      l(a.value, {
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
      (a = Ba(a)),
      (a.tag = 3),
      (a.payload = { element: null }),
      (a.callback = function () {
        ss(e, t);
      }),
      a
    );
  }
  function dd(e) {
    return ((e = Ba(e)), (e.tag = 3), e);
  }
  function md(e, t, a, l) {
    var i = a.type.getDerivedStateFromError;
    if (typeof i == 'function') {
      var s = l.value;
      ((e.payload = function () {
        return i(s);
      }),
        (e.callback = function () {
          fd(t, a, l);
        }));
    }
    var o = a.stateNode;
    o !== null &&
      typeof o.componentDidCatch == 'function' &&
      (e.callback = function () {
        (fd(t, a, l),
          typeof i != 'function' &&
            (Za === null ? (Za = new Set([this])) : Za.add(this)));
        var y = l.stack;
        this.componentDidCatch(l.value, {
          componentStack: y !== null ? y : '',
        });
      });
  }
  function Sg(e, t, a, l, i) {
    if (
      ((a.flags |= 32768),
      l !== null && typeof l == 'object' && typeof l.then == 'function')
    ) {
      if (
        ((t = a.alternate),
        t !== null && $l(t, a, i, !0),
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
              l === Ki
                ? (a.flags |= 16384)
                : ((t = a.updateQueue),
                  t === null ? (a.updateQueue = new Set([l])) : t.add(l),
                  Ku(e, l, i)),
              !1
            );
          case 22:
            return (
              (a.flags |= 65536),
              l === Ki
                ? (a.flags |= 16384)
                : ((t = a.updateQueue),
                  t === null
                    ? ((t = {
                        transitions: null,
                        markerInstances: null,
                        retryQueue: new Set([l]),
                      }),
                      (a.updateQueue = t))
                    : ((a = t.retryQueue),
                      a === null ? (t.retryQueue = new Set([l])) : a.add(l)),
                  Ku(e, l, i)),
              !1
            );
        }
        throw Error(c(435, a.tag));
      }
      return (Ku(e, l, i), bs(), !1);
    }
    if (Ne)
      return (
        (t = zt.current),
        t !== null
          ? ((t.flags & 65536) === 0 && (t.flags |= 256),
            (t.flags |= 65536),
            (t.lanes = i),
            l !== Yr && ((e = Error(c(422), { cause: l })), kn(Ht(e, a))))
          : (l !== Yr && ((t = Error(c(423), { cause: l })), kn(Ht(t, a))),
            (e = e.current.alternate),
            (e.flags |= 65536),
            (i &= -i),
            (e.lanes |= i),
            (l = Ht(l, a)),
            (i = Eu(e.stateNode, l, i)),
            Ir(e, i),
            $e !== 4 && ($e = 2)),
        !1
      );
    var s = Error(c(520), { cause: l });
    if (
      ((s = Ht(s, a)),
      ti === null ? (ti = [s]) : ti.push(s),
      $e !== 4 && ($e = 2),
      t === null)
    )
      return !0;
    ((l = Ht(l, a)), (a = t));
    do {
      switch (a.tag) {
        case 3:
          return (
            (a.flags |= 65536),
            (e = i & -i),
            (a.lanes |= e),
            (e = Eu(a.stateNode, l, e)),
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
              (i = dd(i)),
              md(i, e, a, l),
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
  function dt(e, t, a, l) {
    t.child = e === null ? gf(t, null, a, l) : xl(t, e.child, a, l);
  }
  function hd(e, t, a, l, i) {
    a = a.render;
    var s = t.ref;
    if ('ref' in l) {
      var o = {};
      for (var y in l) y !== 'ref' && (o[y] = l[y]);
    } else o = l;
    return (
      pl(t),
      (l = nu(e, t, a, o, s, i)),
      (y = iu()),
      e !== null && !et
        ? (su(e, t, i), ya(e, t, i))
        : (Ne && y && qr(t), (t.flags |= 1), dt(e, t, l, i), t.child)
    );
  }
  function yd(e, t, a, l, i) {
    if (e === null) {
      var s = a.type;
      return typeof s == 'function' &&
        !kr(s) &&
        s.defaultProps === void 0 &&
        a.compare === null
        ? ((t.tag = 15), (t.type = s), pd(e, t, s, l, i))
        : ((e = Yi(a.type, null, l, t, t.mode, i)),
          (e.ref = t.ref),
          (e.return = t),
          (t.child = e));
    }
    if (((s = e.child), !Cu(e, i))) {
      var o = s.memoizedProps;
      if (
        ((a = a.compare), (a = a !== null ? a : Mn), a(o, l) && e.ref === t.ref)
      )
        return ya(e, t, i);
    }
    return (
      (t.flags |= 1),
      (e = ca(s, l)),
      (e.ref = t.ref),
      (e.return = t),
      (t.child = e)
    );
  }
  function pd(e, t, a, l, i) {
    if (e !== null) {
      var s = e.memoizedProps;
      if (Mn(s, l) && e.ref === t.ref)
        if (((et = !1), (t.pendingProps = l = s), Cu(e, i)))
          (e.flags & 131072) !== 0 && (et = !0);
        else return ((t.lanes = e.lanes), ya(e, t, i));
    }
    return Au(e, t, a, l, i);
  }
  function gd(e, t, a, l) {
    var i = l.children,
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
      l.mode === 'hidden')
    ) {
      if ((t.flags & 128) !== 0) {
        if (((s = s !== null ? s.baseLanes | a : a), e !== null)) {
          for (l = t.child = e.child, i = 0; l !== null; )
            ((i = i | l.lanes | l.childLanes), (l = l.sibling));
          l = i & ~s;
        } else ((l = 0), (t.child = null));
        return bd(e, t, s, a, l);
      }
      if ((a & 536870912) !== 0)
        ((t.memoizedState = { baseLanes: 0, cachePool: null }),
          e !== null && Vi(t, s !== null ? s.cachePool : null),
          s !== null ? xf(t, s) : eu(),
          Sf(t));
      else
        return (
          (l = t.lanes = 536870912),
          bd(e, t, s !== null ? s.baseLanes | a : a, a, l)
        );
    } else
      s !== null
        ? (Vi(t, s.cachePool), xf(t, s), La(), (t.memoizedState = null))
        : (e !== null && Vi(t, null), eu(), La());
    return (dt(e, t, i, a), t.child);
  }
  function Jn(e, t) {
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
  function bd(e, t, a, l, i) {
    var s = Jr();
    return (
      (s = s === null ? null : { parent: Ie._currentValue, pool: s }),
      (t.memoizedState = { baseLanes: a, cachePool: s }),
      e !== null && Vi(t, null),
      eu(),
      Sf(t),
      e !== null && $l(e, t, l, !0),
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
  function vd(e, t, a) {
    return (
      xl(t, e.child, null, a),
      (e = rs(t, t.pendingProps)),
      (e.flags |= 2),
      _t(t),
      (t.memoizedState = null),
      e
    );
  }
  function Eg(e, t, a) {
    var l = t.pendingProps,
      i = (t.flags & 128) !== 0;
    if (((t.flags &= -129), e === null)) {
      if (Ne) {
        if (l.mode === 'hidden')
          return ((e = rs(t, l)), (t.lanes = 536870912), Jn(null, e));
        if (
          (au(t),
          (e = Ge)
            ? ((e = Cm(e, Yt)),
              (e = e !== null && e.data === '&' ? e : null),
              e !== null &&
                ((t.memoizedState = {
                  dehydrated: e,
                  treeContext: Oa !== null ? { id: Wt, overflow: Ft } : null,
                  retryLane: 536870912,
                  hydrationErrors: null,
                }),
                (a = tf(e)),
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
      return rs(t, l);
    }
    var s = e.memoizedState;
    if (s !== null) {
      var o = s.dehydrated;
      if ((au(t), i))
        if (t.flags & 256) ((t.flags &= -257), (t = vd(e, t, a)));
        else if (t.memoizedState !== null)
          ((t.child = e.child), (t.flags |= 128), (t = null));
        else throw Error(c(558));
      else if (
        (et || $l(e, t, a, !1), (i = (a & e.childLanes) !== 0), et || i)
      ) {
        if (
          ((l = qe),
          l !== null && ((o = ro(l, a)), o !== 0 && o !== s.retryLane))
        )
          throw ((s.retryLane = o), dl(e, o), Tt(l, e, o), Tu);
        (bs(), (t = vd(e, t, a)));
      } else
        ((e = s.treeContext),
          (Ge = Xt(o.nextSibling)),
          (ot = t),
          (Ne = !0),
          (Ma = null),
          (Yt = !1),
          e !== null && nf(t, e),
          (t = rs(t, l)),
          (t.flags |= 4096));
      return t;
    }
    return (
      (e = ca(e.child, { mode: l.mode, children: l.children })),
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
  function Au(e, t, a, l, i) {
    return (
      pl(t),
      (a = nu(e, t, a, l, void 0, i)),
      (l = iu()),
      e !== null && !et
        ? (su(e, t, i), ya(e, t, i))
        : (Ne && l && qr(t), (t.flags |= 1), dt(e, t, a, i), t.child)
    );
  }
  function xd(e, t, a, l, i, s) {
    return (
      pl(t),
      (t.updateQueue = null),
      (a = Tf(t, l, a, i)),
      Ef(e),
      (l = iu()),
      e !== null && !et
        ? (su(e, t, s), ya(e, t, s))
        : (Ne && l && qr(t), (t.flags |= 1), dt(e, t, a, s), t.child)
    );
  }
  function Sd(e, t, a, l, i) {
    if ((pl(t), t.stateNode === null)) {
      var s = Vl,
        o = a.contextType;
      (typeof o == 'object' && o !== null && (s = ft(o)),
        (s = new a(l, s)),
        (t.memoizedState =
          s.state !== null && s.state !== void 0 ? s.state : null),
        (s.updater = Su),
        (t.stateNode = s),
        (s._reactInternals = t),
        (s = t.stateNode),
        (s.props = l),
        (s.state = t.memoizedState),
        (s.refs = {}),
        Wr(t),
        (o = a.contextType),
        (s.context = typeof o == 'object' && o !== null ? ft(o) : Vl),
        (s.state = t.memoizedState),
        (o = a.getDerivedStateFromProps),
        typeof o == 'function' && (xu(t, a, o, l), (s.state = t.memoizedState)),
        typeof a.getDerivedStateFromProps == 'function' ||
          typeof s.getSnapshotBeforeUpdate == 'function' ||
          (typeof s.UNSAFE_componentWillMount != 'function' &&
            typeof s.componentWillMount != 'function') ||
          ((o = s.state),
          typeof s.componentWillMount == 'function' && s.componentWillMount(),
          typeof s.UNSAFE_componentWillMount == 'function' &&
            s.UNSAFE_componentWillMount(),
          o !== s.state && Su.enqueueReplaceState(s, s.state, null),
          Xn(t, l, s, i),
          Gn(),
          (s.state = t.memoizedState)),
        typeof s.componentDidMount == 'function' && (t.flags |= 4194308),
        (l = !0));
    } else if (e === null) {
      s = t.stateNode;
      var y = t.memoizedProps,
        E = El(a, y);
      s.props = E;
      var _ = s.context,
        k = a.contextType;
      ((o = Vl), typeof k == 'object' && k !== null && (o = ft(k)));
      var Y = a.getDerivedStateFromProps;
      ((k =
        typeof Y == 'function' ||
        typeof s.getSnapshotBeforeUpdate == 'function'),
        (y = t.pendingProps !== y),
        k ||
          (typeof s.UNSAFE_componentWillReceiveProps != 'function' &&
            typeof s.componentWillReceiveProps != 'function') ||
          ((y || _ !== o) && rd(t, s, l, o)),
        (ka = !1));
      var O = t.memoizedState;
      ((s.state = O),
        Xn(t, l, s, i),
        Gn(),
        (_ = t.memoizedState),
        y || O !== _ || ka
          ? (typeof Y == 'function' && (xu(t, a, Y, l), (_ = t.memoizedState)),
            (E = ka || sd(t, a, E, l, O, _, o))
              ? (k ||
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
                (t.memoizedProps = l),
                (t.memoizedState = _)),
            (s.props = l),
            (s.state = _),
            (s.context = o),
            (l = E))
          : (typeof s.componentDidMount == 'function' && (t.flags |= 4194308),
            (l = !1)));
    } else {
      ((s = t.stateNode),
        Fr(e, t),
        (o = t.memoizedProps),
        (k = El(a, o)),
        (s.props = k),
        (Y = t.pendingProps),
        (O = s.context),
        (_ = a.contextType),
        (E = Vl),
        typeof _ == 'object' && _ !== null && (E = ft(_)),
        (y = a.getDerivedStateFromProps),
        (_ =
          typeof y == 'function' ||
          typeof s.getSnapshotBeforeUpdate == 'function') ||
          (typeof s.UNSAFE_componentWillReceiveProps != 'function' &&
            typeof s.componentWillReceiveProps != 'function') ||
          ((o !== Y || O !== E) && rd(t, s, l, E)),
        (ka = !1),
        (O = t.memoizedState),
        (s.state = O),
        Xn(t, l, s, i),
        Gn());
      var D = t.memoizedState;
      o !== Y ||
      O !== D ||
      ka ||
      (e !== null && e.dependencies !== null && Xi(e.dependencies))
        ? (typeof y == 'function' && (xu(t, a, y, l), (D = t.memoizedState)),
          (k =
            ka ||
            sd(t, a, k, l, O, D, E) ||
            (e !== null && e.dependencies !== null && Xi(e.dependencies)))
            ? (_ ||
                (typeof s.UNSAFE_componentWillUpdate != 'function' &&
                  typeof s.componentWillUpdate != 'function') ||
                (typeof s.componentWillUpdate == 'function' &&
                  s.componentWillUpdate(l, D, E),
                typeof s.UNSAFE_componentWillUpdate == 'function' &&
                  s.UNSAFE_componentWillUpdate(l, D, E)),
              typeof s.componentDidUpdate == 'function' && (t.flags |= 4),
              typeof s.getSnapshotBeforeUpdate == 'function' &&
                (t.flags |= 1024))
            : (typeof s.componentDidUpdate != 'function' ||
                (o === e.memoizedProps && O === e.memoizedState) ||
                (t.flags |= 4),
              typeof s.getSnapshotBeforeUpdate != 'function' ||
                (o === e.memoizedProps && O === e.memoizedState) ||
                (t.flags |= 1024),
              (t.memoizedProps = l),
              (t.memoizedState = D)),
          (s.props = l),
          (s.state = D),
          (s.context = E),
          (l = k))
        : (typeof s.componentDidUpdate != 'function' ||
            (o === e.memoizedProps && O === e.memoizedState) ||
            (t.flags |= 4),
          typeof s.getSnapshotBeforeUpdate != 'function' ||
            (o === e.memoizedProps && O === e.memoizedState) ||
            (t.flags |= 1024),
          (l = !1));
    }
    return (
      (s = l),
      us(e, t),
      (l = (t.flags & 128) !== 0),
      s || l
        ? ((s = t.stateNode),
          (a =
            l && typeof a.getDerivedStateFromError != 'function'
              ? null
              : s.render()),
          (t.flags |= 1),
          e !== null && l
            ? ((t.child = xl(t, e.child, null, i)),
              (t.child = xl(t, null, a, i)))
            : dt(e, t, a, i),
          (t.memoizedState = s.state),
          (e = t.child))
        : (e = ya(e, t, i)),
      e
    );
  }
  function Ed(e, t, a, l) {
    return (hl(), (t.flags |= 256), dt(e, t, a, l), t.child);
  }
  var wu = {
    dehydrated: null,
    treeContext: null,
    retryLane: 0,
    hydrationErrors: null,
  };
  function ju(e) {
    return { baseLanes: e, cachePool: ff() };
  }
  function Nu(e, t, a) {
    return ((e = e !== null ? e.childLanes & ~a : 0), t && (e |= Ot), e);
  }
  function Td(e, t, a) {
    var l = t.pendingProps,
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
            ? ((e = Cm(e, Yt)),
              (e = e !== null && e.data !== '&' ? e : null),
              e !== null &&
                ((t.memoizedState = {
                  dehydrated: e,
                  treeContext: Oa !== null ? { id: Wt, overflow: Ft } : null,
                  retryLane: 536870912,
                  hydrationErrors: null,
                }),
                (a = tf(e)),
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
      var y = l.children;
      return (
        (l = l.fallback),
        i
          ? (La(),
            (i = t.mode),
            (y = cs({ mode: 'hidden', children: y }, i)),
            (l = ml(l, i, a, null)),
            (y.return = t),
            (l.return = t),
            (y.sibling = l),
            (t.child = y),
            (l = t.child),
            (l.memoizedState = ju(a)),
            (l.childLanes = Nu(e, o, a)),
            (t.memoizedState = wu),
            Jn(null, l))
          : (qa(t), Ru(t, y))
      );
    }
    var E = e.memoizedState;
    if (E !== null && ((y = E.dehydrated), y !== null)) {
      if (s)
        t.flags & 256
          ? (qa(t), (t.flags &= -257), (t = zu(e, t, a)))
          : t.memoizedState !== null
            ? (La(), (t.child = e.child), (t.flags |= 128), (t = null))
            : (La(),
              (y = l.fallback),
              (i = t.mode),
              (l = cs({ mode: 'visible', children: l.children }, i)),
              (y = ml(y, i, a, null)),
              (y.flags |= 2),
              (l.return = t),
              (y.return = t),
              (l.sibling = y),
              (t.child = l),
              xl(t, e.child, null, a),
              (l = t.child),
              (l.memoizedState = ju(a)),
              (l.childLanes = Nu(e, o, a)),
              (t.memoizedState = wu),
              (t = Jn(null, l)));
      else if ((qa(t), cc(y))) {
        if (((o = y.nextSibling && y.nextSibling.dataset), o)) var _ = o.dgst;
        ((o = _),
          (l = Error(c(419))),
          (l.stack = ''),
          (l.digest = o),
          kn({ value: l, source: null, stack: null }),
          (t = zu(e, t, a)));
      } else if (
        (et || $l(e, t, a, !1), (o = (a & e.childLanes) !== 0), et || o)
      ) {
        if (
          ((o = qe),
          o !== null && ((l = ro(o, a)), l !== 0 && l !== E.retryLane))
        )
          throw ((E.retryLane = l), dl(e, l), Tt(o, e, l), Tu);
        (uc(y) || bs(), (t = zu(e, t, a)));
      } else
        uc(y)
          ? ((t.flags |= 192), (t.child = e.child), (t = null))
          : ((e = E.treeContext),
            (Ge = Xt(y.nextSibling)),
            (ot = t),
            (Ne = !0),
            (Ma = null),
            (Yt = !1),
            e !== null && nf(t, e),
            (t = Ru(t, l.children)),
            (t.flags |= 4096));
      return t;
    }
    return i
      ? (La(),
        (y = l.fallback),
        (i = t.mode),
        (E = e.child),
        (_ = E.sibling),
        (l = ca(E, { mode: 'hidden', children: l.children })),
        (l.subtreeFlags = E.subtreeFlags & 65011712),
        _ !== null ? (y = ca(_, y)) : ((y = ml(y, i, a, null)), (y.flags |= 2)),
        (y.return = t),
        (l.return = t),
        (l.sibling = y),
        (t.child = l),
        Jn(null, l),
        (l = t.child),
        (y = e.child.memoizedState),
        y === null
          ? (y = ju(a))
          : ((i = y.cachePool),
            i !== null
              ? ((E = Ie._currentValue),
                (i = i.parent !== E ? { parent: E, pool: E } : i))
              : (i = ff()),
            (y = { baseLanes: y.baseLanes | a, cachePool: i })),
        (l.memoizedState = y),
        (l.childLanes = Nu(e, o, a)),
        (t.memoizedState = wu),
        Jn(e.child, l))
      : (qa(t),
        (a = e.child),
        (e = a.sibling),
        (a = ca(a, { mode: 'visible', children: l.children })),
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
      xl(t, e.child, null, a),
      (e = Ru(t, t.pendingProps.children)),
      (e.flags |= 2),
      (t.memoizedState = null),
      e
    );
  }
  function Ad(e, t, a) {
    e.lanes |= t;
    var l = e.alternate;
    (l !== null && (l.lanes |= t), Zr(e.return, t, a));
  }
  function _u(e, t, a, l, i, s) {
    var o = e.memoizedState;
    o === null
      ? (e.memoizedState = {
          isBackwards: t,
          rendering: null,
          renderingStartTime: 0,
          last: l,
          tail: a,
          tailMode: i,
          treeForkCount: s,
        })
      : ((o.isBackwards = t),
        (o.rendering = null),
        (o.renderingStartTime = 0),
        (o.last = l),
        (o.tail = a),
        (o.tailMode = i),
        (o.treeForkCount = s));
  }
  function wd(e, t, a) {
    var l = t.pendingProps,
      i = l.revealOrder,
      s = l.tail;
    l = l.children;
    var o = We.current,
      y = (o & 2) !== 0;
    if (
      (y ? ((o = (o & 1) | 2), (t.flags |= 128)) : (o &= 1),
      T(We, o),
      dt(e, t, l, a),
      (l = Ne ? Un : 0),
      !y && e !== null && (e.flags & 128) !== 0)
    )
      e: for (e = t.child; e !== null; ) {
        if (e.tag === 13) e.memoizedState !== null && Ad(e, a, t);
        else if (e.tag === 19) Ad(e, a, t);
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
          _u(t, !1, i, a, s, l));
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
        _u(t, !0, a, null, s, l);
        break;
      case 'together':
        _u(t, !1, null, null, void 0, l);
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
        if (($l(e, t, a, !1), (a & t.childLanes) === 0)) return null;
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
  function Cu(e, t) {
    return (e.lanes & t) !== 0
      ? !0
      : ((e = e.dependencies), !!(e !== null && Xi(e)));
  }
  function Tg(e, t, a) {
    switch (t.tag) {
      case 3:
        (fe(t, t.stateNode.containerInfo),
          Ua(t, Ie, e.memoizedState.cache),
          hl());
        break;
      case 27:
      case 5:
        F(t);
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
        var l = t.memoizedState;
        if (l !== null)
          return l.dehydrated !== null
            ? (qa(t), (t.flags |= 128), null)
            : (a & t.child.childLanes) !== 0
              ? Td(e, t, a)
              : (qa(t), (e = ya(e, t, a)), e !== null ? e.sibling : null);
        qa(t);
        break;
      case 19:
        var i = (e.flags & 128) !== 0;
        if (
          ((l = (a & t.childLanes) !== 0),
          l || ($l(e, t, a, !1), (l = (a & t.childLanes) !== 0)),
          i)
        ) {
          if (l) return wd(e, t, a);
          t.flags |= 128;
        }
        if (
          ((i = t.memoizedState),
          i !== null &&
            ((i.rendering = null), (i.tail = null), (i.lastEffect = null)),
          T(We, We.current),
          l)
        )
          break;
        return null;
      case 22:
        return ((t.lanes = 0), gd(e, t, a, t.pendingProps));
      case 24:
        Ua(t, Ie, e.memoizedState.cache);
    }
    return ya(e, t, a);
  }
  function jd(e, t, a) {
    if (e !== null)
      if (e.memoizedProps !== t.pendingProps) et = !0;
      else {
        if (!Cu(e, a) && (t.flags & 128) === 0) return ((et = !1), Tg(e, t, a));
        et = (e.flags & 131072) !== 0;
      }
    else ((et = !1), Ne && (t.flags & 1048576) !== 0 && lf(t, Un, t.index));
    switch (((t.lanes = 0), t.tag)) {
      case 16:
        e: {
          var l = t.pendingProps;
          if (((e = bl(t.elementType)), (t.type = e), typeof e == 'function'))
            kr(e)
              ? ((l = El(e, l)), (t.tag = 1), (t = Sd(null, t, e, l, a)))
              : ((t.tag = 0), (t = Au(null, t, e, l, a)));
          else {
            if (e != null) {
              var i = e.$$typeof;
              if (i === te) {
                ((t.tag = 11), (t = hd(null, t, e, l, a)));
                break e;
              } else if (i === $) {
                ((t.tag = 14), (t = yd(null, t, e, l, a)));
                break e;
              }
            }
            throw ((t = ze(e) || e), Error(c(306, t, '')));
          }
        }
        return t;
      case 0:
        return Au(e, t, t.type, t.pendingProps, a);
      case 1:
        return ((l = t.type), (i = El(l, t.pendingProps)), Sd(e, t, l, i, a));
      case 3:
        e: {
          if ((fe(t, t.stateNode.containerInfo), e === null))
            throw Error(c(387));
          l = t.pendingProps;
          var s = t.memoizedState;
          ((i = s.element), Fr(e, t), Xn(t, l, null, a));
          var o = t.memoizedState;
          if (
            ((l = o.cache),
            Ua(t, Ie, l),
            l !== s.cache && Vr(t, [Ie], a, !0),
            Gn(),
            (l = o.element),
            s.isDehydrated)
          )
            if (
              ((s = { element: l, isDehydrated: !1, cache: o.cache }),
              (t.updateQueue.baseState = s),
              (t.memoizedState = s),
              t.flags & 256)
            ) {
              t = Ed(e, t, l, a);
              break e;
            } else if (l !== i) {
              ((i = Ht(Error(c(424)), t)), kn(i), (t = Ed(e, t, l, a)));
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
                  a = gf(t, null, l, a),
                  t.child = a;
                a;
              )
                ((a.flags = (a.flags & -3) | 4096), (a = a.sibling));
            }
          else {
            if ((hl(), l === i)) {
              t = ya(e, t, a);
              break e;
            }
            dt(e, t, l, a);
          }
          t = t.child;
        }
        return t;
      case 26:
        return (
          us(e, t),
          e === null
            ? (a = Bm(t.type, null, t.pendingProps, null))
              ? (t.memoizedState = a)
              : Ne ||
                ((a = t.type),
                (e = t.pendingProps),
                (l = ws(K.current).createElement(a)),
                (l[ct] = t),
                (l[gt] = e),
                mt(l, a, e),
                it(l),
                (t.stateNode = l))
            : (t.memoizedState = Bm(
                t.type,
                e.memoizedProps,
                t.pendingProps,
                e.memoizedState,
              )),
          null
        );
      case 27:
        return (
          F(t),
          e === null &&
            Ne &&
            ((l = t.stateNode = Dm(t.type, t.pendingProps, K.current)),
            (ot = t),
            (Yt = !0),
            (i = Ge),
            Ja(t.type) ? ((oc = i), (Ge = Xt(l.firstChild))) : (Ge = i)),
          dt(e, t, t.pendingProps.children, a),
          us(e, t),
          e === null && (t.flags |= 4194304),
          t.child
        );
      case 5:
        return (
          e === null &&
            Ne &&
            ((i = l = Ge) &&
              ((l = Pg(l, t.type, t.pendingProps, Yt)),
              l !== null
                ? ((t.stateNode = l),
                  (ot = t),
                  (Ge = Xt(l.firstChild)),
                  (Yt = !1),
                  (i = !0))
                : (i = !1)),
            i || Da(t)),
          F(t),
          (i = t.type),
          (s = t.pendingProps),
          (o = e !== null ? e.memoizedProps : null),
          (l = s.children),
          ic(i, s) ? (l = null) : o !== null && ic(i, o) && (t.flags |= 32),
          t.memoizedState !== null &&
            ((i = nu(e, t, hg, null, null, a)), (ci._currentValue = i)),
          us(e, t),
          dt(e, t, l, a),
          t.child
        );
      case 6:
        return (
          e === null &&
            Ne &&
            ((e = a = Ge) &&
              ((a = eb(a, t.pendingProps, Yt)),
              a !== null
                ? ((t.stateNode = a), (ot = t), (Ge = null), (e = !0))
                : (e = !1)),
            e || Da(t)),
          null
        );
      case 13:
        return Td(e, t, a);
      case 4:
        return (
          fe(t, t.stateNode.containerInfo),
          (l = t.pendingProps),
          e === null ? (t.child = xl(t, null, l, a)) : dt(e, t, l, a),
          t.child
        );
      case 11:
        return hd(e, t, t.type, t.pendingProps, a);
      case 7:
        return (dt(e, t, t.pendingProps, a), t.child);
      case 8:
        return (dt(e, t, t.pendingProps.children, a), t.child);
      case 12:
        return (dt(e, t, t.pendingProps.children, a), t.child);
      case 10:
        return (
          (l = t.pendingProps),
          Ua(t, t.type, l.value),
          dt(e, t, l.children, a),
          t.child
        );
      case 9:
        return (
          (i = t.type._context),
          (l = t.pendingProps.children),
          pl(t),
          (i = ft(i)),
          (l = l(i)),
          (t.flags |= 1),
          dt(e, t, l, a),
          t.child
        );
      case 14:
        return yd(e, t, t.type, t.pendingProps, a);
      case 15:
        return pd(e, t, t.type, t.pendingProps, a);
      case 19:
        return wd(e, t, a);
      case 31:
        return Eg(e, t, a);
      case 22:
        return gd(e, t, a, t.pendingProps);
      case 24:
        return (
          pl(t),
          (l = ft(Ie)),
          e === null
            ? ((i = Jr()),
              i === null &&
                ((i = qe),
                (s = Qr()),
                (i.pooledCache = s),
                s.refCount++,
                s !== null && (i.pooledCacheLanes |= a),
                (i = s)),
              (t.memoizedState = { parent: l, cache: i }),
              Wr(t),
              Ua(t, Ie, i))
            : ((e.lanes & a) !== 0 && (Fr(e, t), Xn(t, null, null, a), Gn()),
              (i = e.memoizedState),
              (s = t.memoizedState),
              i.parent !== l
                ? ((i = { parent: l, cache: l }),
                  (t.memoizedState = i),
                  t.lanes === 0 &&
                    (t.memoizedState = t.updateQueue.baseState = i),
                  Ua(t, Ie, l))
                : ((l = s.cache),
                  Ua(t, Ie, l),
                  l !== i.cache && Vr(t, [Ie], a, !0))),
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
  function Ou(e, t, a, l, i) {
    if (((t = (e.mode & 32) !== 0) && (t = !1), t)) {
      if (((e.flags |= 16777216), (i & 335544128) === i))
        if (e.stateNode.complete) e.flags |= 8192;
        else if (Pd()) e.flags |= 8192;
        else throw ((vl = Ki), $r);
    } else e.flags &= -16777217;
  }
  function Nd(e, t) {
    if (t.type !== 'stylesheet' || (t.state.loading & 4) !== 0)
      e.flags &= -16777217;
    else if (((e.flags |= 16777216), !Gm(t)))
      if (Pd()) e.flags |= 8192;
      else throw ((vl = Ki), $r);
  }
  function os(e, t) {
    (t !== null && (e.flags |= 4),
      e.flags & 16384 &&
        ((t = e.tag !== 22 ? no() : 536870912), (e.lanes |= t), (un |= t)));
  }
  function $n(e, t) {
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
          for (var l = null; a !== null; )
            (a.alternate !== null && (l = a), (a = a.sibling));
          l === null
            ? t || e.tail === null
              ? (e.tail = null)
              : (e.tail.sibling = null)
            : (l.sibling = null);
      }
  }
  function Xe(e) {
    var t = e.alternate !== null && e.alternate.child === e.child,
      a = 0,
      l = 0;
    if (t)
      for (var i = e.child; i !== null; )
        ((a |= i.lanes | i.childLanes),
          (l |= i.subtreeFlags & 65011712),
          (l |= i.flags & 65011712),
          (i.return = e),
          (i = i.sibling));
    else
      for (i = e.child; i !== null; )
        ((a |= i.lanes | i.childLanes),
          (l |= i.subtreeFlags),
          (l |= i.flags),
          (i.return = e),
          (i = i.sibling));
    return ((e.subtreeFlags |= l), (e.childLanes = a), t);
  }
  function Ag(e, t, a) {
    var l = t.pendingProps;
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
          (l = null),
          e !== null && (l = e.memoizedState.cache),
          t.memoizedState.cache !== l && (t.flags |= 2048),
          da(Ie),
          L(),
          a.pendingContext &&
            ((a.context = a.pendingContext), (a.pendingContext = null)),
          (e === null || e.child === null) &&
            (Jl(t)
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
              s !== null ? (Xe(t), Nd(t, s)) : (Xe(t), Ou(t, i, null, l, a)))
            : s
              ? s !== e.memoizedState
                ? (pa(t), Xe(t), Nd(t, s))
                : (Xe(t), (t.flags &= -16777217))
              : ((e = e.memoizedProps),
                e !== l && pa(t),
                Xe(t),
                Ou(t, i, e, l, a)),
          null
        );
      case 27:
        if (
          (Se(t),
          (a = K.current),
          (i = t.type),
          e !== null && t.stateNode != null)
        )
          e.memoizedProps !== l && pa(t);
        else {
          if (!l) {
            if (t.stateNode === null) throw Error(c(166));
            return (Xe(t), null);
          }
          ((e = M.current),
            Jl(t) ? sf(t) : ((e = Dm(i, l, a)), (t.stateNode = e), pa(t)));
        }
        return (Xe(t), null);
      case 5:
        if ((Se(t), (i = t.type), e !== null && t.stateNode != null))
          e.memoizedProps !== l && pa(t);
        else {
          if (!l) {
            if (t.stateNode === null) throw Error(c(166));
            return (Xe(t), null);
          }
          if (((s = M.current), Jl(t))) sf(t);
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
                      typeof l.is == 'string'
                        ? o.createElement('select', { is: l.is })
                        : o.createElement('select')),
                      l.multiple
                        ? (s.multiple = !0)
                        : l.size && (s.size = l.size));
                    break;
                  default:
                    s =
                      typeof l.is == 'string'
                        ? o.createElement(i, { is: l.is })
                        : o.createElement(i);
                }
            }
            ((s[ct] = t), (s[gt] = l));
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
            e: switch ((mt(s, i, l), i)) {
              case 'button':
              case 'input':
              case 'select':
              case 'textarea':
                l = !!l.autoFocus;
                break e;
              case 'img':
                l = !0;
                break e;
              default:
                l = !1;
            }
            l && pa(t);
          }
        }
        return (
          Xe(t),
          Ou(t, t.type, e === null ? null : e.memoizedProps, t.pendingProps, a),
          null
        );
      case 6:
        if (e && t.stateNode != null) e.memoizedProps !== l && pa(t);
        else {
          if (typeof l != 'string' && t.stateNode === null) throw Error(c(166));
          if (((e = K.current), Jl(t))) {
            if (
              ((e = t.stateNode),
              (a = t.memoizedProps),
              (l = null),
              (i = ot),
              i !== null)
            )
              switch (i.tag) {
                case 27:
                case 5:
                  l = i.memoizedProps;
              }
            ((e[ct] = t),
              (e = !!(
                e.nodeValue === a ||
                (l !== null && l.suppressHydrationWarning === !0) ||
                Tm(e.nodeValue, a)
              )),
              e || Da(t, !0));
          } else
            ((e = ws(e).createTextNode(l)), (e[ct] = t), (t.stateNode = e));
        }
        return (Xe(t), null);
      case 31:
        if (((a = t.memoizedState), e === null || e.memoizedState !== null)) {
          if (((l = Jl(t)), a !== null)) {
            if (e === null) {
              if (!l) throw Error(c(318));
              if (
                ((e = t.memoizedState),
                (e = e !== null ? e.dehydrated : null),
                !e)
              )
                throw Error(c(557));
              e[ct] = t;
            } else
              (hl(),
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
          ((l = t.memoizedState),
          e === null ||
            (e.memoizedState !== null && e.memoizedState.dehydrated !== null))
        ) {
          if (((i = Jl(t)), l !== null && l.dehydrated !== null)) {
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
              (hl(),
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
            : ((a = l !== null),
              (e = e !== null && e.memoizedState !== null),
              a &&
                ((l = t.child),
                (i = null),
                l.alternate !== null &&
                  l.alternate.memoizedState !== null &&
                  l.alternate.memoizedState.cachePool !== null &&
                  (i = l.alternate.memoizedState.cachePool.pool),
                (s = null),
                l.memoizedState !== null &&
                  l.memoizedState.cachePool !== null &&
                  (s = l.memoizedState.cachePool.pool),
                s !== i && (l.flags |= 2048)),
              a !== e && a && (t.child.flags |= 8192),
              os(t, t.updateQueue),
              Xe(t),
              null)
        );
      case 4:
        return (L(), e === null && ec(t.stateNode.containerInfo), Xe(t), null);
      case 10:
        return (da(t.type), Xe(t), null);
      case 19:
        if ((g(We), (l = t.memoizedState), l === null)) return (Xe(t), null);
        if (((i = (t.flags & 128) !== 0), (s = l.rendering), s === null))
          if (i) $n(l, !1);
          else {
            if ($e !== 0 || (e !== null && (e.flags & 128) !== 0))
              for (e = t.child; e !== null; ) {
                if (((s = Fi(e)), s !== null)) {
                  for (
                    t.flags |= 128,
                      $n(l, !1),
                      e = s.updateQueue,
                      t.updateQueue = e,
                      os(t, e),
                      t.subtreeFlags = 0,
                      e = a,
                      a = t.child;
                    a !== null;
                  )
                    (ef(a, e), (a = a.sibling));
                  return (
                    T(We, (We.current & 1) | 2),
                    Ne && oa(t, l.treeForkCount),
                    t.child
                  );
                }
                e = e.sibling;
              }
            l.tail !== null &&
              At() > ys &&
              ((t.flags |= 128), (i = !0), $n(l, !1), (t.lanes = 4194304));
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
                $n(l, !0),
                l.tail === null &&
                  l.tailMode === 'hidden' &&
                  !s.alternate &&
                  !Ne)
              )
                return (Xe(t), null);
            } else
              2 * At() - l.renderingStartTime > ys &&
                a !== 536870912 &&
                ((t.flags |= 128), (i = !0), $n(l, !1), (t.lanes = 4194304));
          l.isBackwards
            ? ((s.sibling = t.child), (t.child = s))
            : ((e = l.last),
              e !== null ? (e.sibling = s) : (t.child = s),
              (l.last = s));
        }
        return l.tail !== null
          ? ((e = l.tail),
            (l.rendering = e),
            (l.tail = e.sibling),
            (l.renderingStartTime = At()),
            (e.sibling = null),
            (a = We.current),
            T(We, i ? (a & 1) | 2 : a & 1),
            Ne && oa(t, l.treeForkCount),
            e)
          : (Xe(t), null);
      case 22:
      case 23:
        return (
          _t(t),
          tu(),
          (l = t.memoizedState !== null),
          e !== null
            ? (e.memoizedState !== null) !== l && (t.flags |= 8192)
            : l && (t.flags |= 8192),
          l
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
          (l = null),
          t.memoizedState !== null &&
            t.memoizedState.cachePool !== null &&
            (l = t.memoizedState.cachePool.pool),
          l !== a && (t.flags |= 2048),
          e !== null && g(gl),
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
  function wg(e, t) {
    switch ((Lr(t), t.tag)) {
      case 1:
        return (
          (e = t.flags),
          e & 65536 ? ((t.flags = (e & -65537) | 128), t) : null
        );
      case 3:
        return (
          da(Ie),
          L(),
          (e = t.flags),
          (e & 65536) !== 0 && (e & 128) === 0
            ? ((t.flags = (e & -65537) | 128), t)
            : null
        );
      case 26:
      case 27:
      case 5:
        return (Se(t), null);
      case 31:
        if (t.memoizedState !== null) {
          if ((_t(t), t.alternate === null)) throw Error(c(340));
          hl();
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
          hl();
        }
        return (
          (e = t.flags),
          e & 65536 ? ((t.flags = (e & -65537) | 128), t) : null
        );
      case 19:
        return (g(We), null);
      case 4:
        return (L(), null);
      case 10:
        return (da(t.type), null);
      case 22:
      case 23:
        return (
          _t(t),
          tu(),
          e !== null && g(gl),
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
  function Rd(e, t) {
    switch ((Lr(t), t.tag)) {
      case 3:
        (da(Ie), L());
        break;
      case 26:
      case 27:
      case 5:
        Se(t);
        break;
      case 4:
        L();
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
        (_t(t), tu(), e !== null && g(gl));
        break;
      case 24:
        da(Ie);
    }
  }
  function Wn(e, t) {
    try {
      var a = t.updateQueue,
        l = a !== null ? a.lastEffect : null;
      if (l !== null) {
        var i = l.next;
        a = i;
        do {
          if ((a.tag & e) === e) {
            l = void 0;
            var s = a.create,
              o = a.inst;
            ((l = s()), (o.destroy = l));
          }
          a = a.next;
        } while (a !== i);
      }
    } catch (y) {
      De(t, t.return, y);
    }
  }
  function Ya(e, t, a) {
    try {
      var l = t.updateQueue,
        i = l !== null ? l.lastEffect : null;
      if (i !== null) {
        var s = i.next;
        l = s;
        do {
          if ((l.tag & e) === e) {
            var o = l.inst,
              y = o.destroy;
            if (y !== void 0) {
              ((o.destroy = void 0), (i = t));
              var E = a,
                _ = y;
              try {
                _();
              } catch (k) {
                De(i, E, k);
              }
            }
          }
          l = l.next;
        } while (l !== s);
      }
    } catch (k) {
      De(t, t.return, k);
    }
  }
  function zd(e) {
    var t = e.updateQueue;
    if (t !== null) {
      var a = e.stateNode;
      try {
        vf(t, a);
      } catch (l) {
        De(e, e.return, l);
      }
    }
  }
  function _d(e, t, a) {
    ((a.props = El(e.type, e.memoizedProps)), (a.state = e.memoizedState));
    try {
      a.componentWillUnmount();
    } catch (l) {
      De(e, t, l);
    }
  }
  function Fn(e, t) {
    try {
      var a = e.ref;
      if (a !== null) {
        switch (e.tag) {
          case 26:
          case 27:
          case 5:
            var l = e.stateNode;
            break;
          case 30:
            l = e.stateNode;
            break;
          default:
            l = e.stateNode;
        }
        typeof a == 'function' ? (e.refCleanup = a(l)) : (a.current = l);
      }
    } catch (i) {
      De(e, t, i);
    }
  }
  function It(e, t) {
    var a = e.ref,
      l = e.refCleanup;
    if (a !== null)
      if (typeof l == 'function')
        try {
          l();
        } catch (i) {
          De(e, t, i);
        } finally {
          ((e.refCleanup = null),
            (e = e.alternate),
            e != null && (e.refCleanup = null));
        }
      else if (typeof a == 'function')
        try {
          a(null);
        } catch (i) {
          De(e, t, i);
        }
      else a.current = null;
  }
  function Cd(e) {
    var t = e.type,
      a = e.memoizedProps,
      l = e.stateNode;
    try {
      e: switch (t) {
        case 'button':
        case 'input':
        case 'select':
        case 'textarea':
          a.autoFocus && l.focus();
          break e;
        case 'img':
          a.src ? (l.src = a.src) : a.srcSet && (l.srcset = a.srcSet);
      }
    } catch (i) {
      De(e, e.return, i);
    }
  }
  function Mu(e, t, a) {
    try {
      var l = e.stateNode;
      (Kg(l, e.type, a, t), (l[gt] = t));
    } catch (i) {
      De(e, e.return, i);
    }
  }
  function Od(e) {
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
        if (e.return === null || Od(e.return)) return null;
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
    var l = e.tag;
    if (l === 5 || l === 6)
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
      l !== 4 &&
      (l === 27 && Ja(e.type) && ((a = e.stateNode), (t = null)),
      (e = e.child),
      e !== null)
    )
      for (Uu(e, t, a), e = e.sibling; e !== null; )
        (Uu(e, t, a), (e = e.sibling));
  }
  function fs(e, t, a) {
    var l = e.tag;
    if (l === 5 || l === 6)
      ((e = e.stateNode), t ? a.insertBefore(e, t) : a.appendChild(e));
    else if (
      l !== 4 &&
      (l === 27 && Ja(e.type) && (a = e.stateNode), (e = e.child), e !== null)
    )
      for (fs(e, t, a), e = e.sibling; e !== null; )
        (fs(e, t, a), (e = e.sibling));
  }
  function Md(e) {
    var t = e.stateNode,
      a = e.memoizedProps;
    try {
      for (var l = e.type, i = t.attributes; i.length; )
        t.removeAttributeNode(i[0]);
      (mt(t, l, a), (t[ct] = e), (t[gt] = a));
    } catch (s) {
      De(e, e.return, s);
    }
  }
  var ga = !1,
    tt = !1,
    ku = !1,
    Dd = typeof WeakSet == 'function' ? WeakSet : Set,
    st = null;
  function jg(e, t) {
    if (((e = e.containerInfo), (lc = Os), (e = Vo(e)), zr(e))) {
      if ('selectionStart' in e)
        var a = { start: e.selectionStart, end: e.selectionEnd };
      else
        e: {
          a = ((a = e.ownerDocument) && a.defaultView) || window;
          var l = a.getSelection && a.getSelection();
          if (l && l.rangeCount !== 0) {
            a = l.anchorNode;
            var i = l.anchorOffset,
              s = l.focusNode;
            l = l.focusOffset;
            try {
              (a.nodeType, s.nodeType);
            } catch {
              a = null;
              break e;
            }
            var o = 0,
              y = -1,
              E = -1,
              _ = 0,
              k = 0,
              Y = e,
              O = null;
            t: for (;;) {
              for (
                var D;
                Y !== a || (i !== 0 && Y.nodeType !== 3) || (y = o + i),
                  Y !== s || (l !== 0 && Y.nodeType !== 3) || (E = o + l),
                  Y.nodeType === 3 && (o += Y.nodeValue.length),
                  (D = Y.firstChild) !== null;
              )
                ((O = Y), (Y = D));
              for (;;) {
                if (Y === e) break t;
                if (
                  (O === a && ++_ === i && (y = o),
                  O === s && ++k === l && (E = o),
                  (D = Y.nextSibling) !== null)
                )
                  break;
                ((Y = O), (O = Y.parentNode));
              }
              Y = D;
            }
            a = y === -1 || E === -1 ? null : { start: y, end: E };
          } else a = null;
        }
      a = a || { start: 0, end: 0 };
    } else a = null;
    for (
      nc = { focusedElem: e, selectionRange: a }, Os = !1, st = t;
      st !== null;
    )
      if (
        ((t = st), (e = t.child), (t.subtreeFlags & 1028) !== 0 && e !== null)
      )
        ((e.return = t), (st = e));
      else
        for (; st !== null; ) {
          switch (((t = st), (s = t.alternate), (e = t.flags), t.tag)) {
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
                  (l = a.stateNode));
                try {
                  var ie = El(a.type, i);
                  ((e = l.getSnapshotBeforeUpdate(ie, s)),
                    (l.__reactInternalSnapshotBeforeUpdate = e));
                } catch (he) {
                  De(a, a.return, he);
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
            ((e.return = t.return), (st = e));
            break;
          }
          st = t.return;
        }
  }
  function Ud(e, t, a) {
    var l = a.flags;
    switch (a.tag) {
      case 0:
      case 11:
      case 15:
        (va(e, a), l & 4 && Wn(5, a));
        break;
      case 1:
        if ((va(e, a), l & 4))
          if (((e = a.stateNode), t === null))
            try {
              e.componentDidMount();
            } catch (o) {
              De(a, a.return, o);
            }
          else {
            var i = El(a.type, t.memoizedProps);
            t = t.memoizedState;
            try {
              e.componentDidUpdate(i, t, e.__reactInternalSnapshotBeforeUpdate);
            } catch (o) {
              De(a, a.return, o);
            }
          }
        (l & 64 && zd(a), l & 512 && Fn(a, a.return));
        break;
      case 3:
        if ((va(e, a), l & 64 && ((e = a.updateQueue), e !== null))) {
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
            vf(e, t);
          } catch (o) {
            De(a, a.return, o);
          }
        }
        break;
      case 27:
        t === null && l & 4 && Md(a);
      case 26:
      case 5:
        (va(e, a), t === null && l & 4 && Cd(a), l & 512 && Fn(a, a.return));
        break;
      case 12:
        va(e, a);
        break;
      case 31:
        (va(e, a), l & 4 && Hd(e, a));
        break;
      case 13:
        (va(e, a),
          l & 4 && qd(e, a),
          l & 64 &&
            ((e = a.memoizedState),
            e !== null &&
              ((e = e.dehydrated),
              e !== null && ((a = Ug.bind(null, a)), tb(e, a)))));
        break;
      case 22:
        if (((l = a.memoizedState !== null || ga), !l)) {
          ((t = (t !== null && t.memoizedState !== null) || tt), (i = ga));
          var s = tt;
          ((ga = l),
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
  function kd(e) {
    var t = e.alternate;
    (t !== null && ((e.alternate = null), kd(t)),
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
    for (a = a.child; a !== null; ) (Bd(e, t, a), (a = a.sibling));
  }
  function Bd(e, t, a) {
    if (wt && typeof wt.onCommitFiberUnmount == 'function')
      try {
        wt.onCommitFiberUnmount(Sn, a);
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
        var l = Ze,
          i = vt;
        (Ja(a.type) && ((Ze = a.stateNode), (vt = !1)),
          ba(e, t, a),
          si(a.stateNode),
          (Ze = l),
          (vt = i));
        break;
      case 5:
        tt || It(a, t);
      case 6:
        if (
          ((l = Ze),
          (i = vt),
          (Ze = null),
          ba(e, t, a),
          (Ze = l),
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
              De(a, t, s);
            }
          else
            try {
              Ze.removeChild(a.stateNode);
            } catch (s) {
              De(a, t, s);
            }
        break;
      case 18:
        Ze !== null &&
          (vt
            ? ((e = Ze),
              zm(
                e.nodeType === 9
                  ? e.body
                  : e.nodeName === 'HTML'
                    ? e.ownerDocument.body
                    : e,
                a.stateNode,
              ),
              pn(e))
            : zm(Ze, a.stateNode));
        break;
      case 4:
        ((l = Ze),
          (i = vt),
          (Ze = a.stateNode.containerInfo),
          (vt = !0),
          ba(e, t, a),
          (Ze = l),
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
          (l = a.stateNode),
          typeof l.componentWillUnmount == 'function' && _d(a, t, l)),
          ba(e, t, a));
        break;
      case 21:
        ba(e, t, a);
        break;
      case 22:
        ((tt = (l = tt) || a.memoizedState !== null), ba(e, t, a), (tt = l));
        break;
      default:
        ba(e, t, a);
    }
  }
  function Hd(e, t) {
    if (
      t.memoizedState === null &&
      ((e = t.alternate), e !== null && ((e = e.memoizedState), e !== null))
    ) {
      e = e.dehydrated;
      try {
        pn(e);
      } catch (a) {
        De(t, t.return, a);
      }
    }
  }
  function qd(e, t) {
    if (
      t.memoizedState === null &&
      ((e = t.alternate),
      e !== null &&
        ((e = e.memoizedState), e !== null && ((e = e.dehydrated), e !== null)))
    )
      try {
        pn(e);
      } catch (a) {
        De(t, t.return, a);
      }
  }
  function Ng(e) {
    switch (e.tag) {
      case 31:
      case 13:
      case 19:
        var t = e.stateNode;
        return (t === null && (t = e.stateNode = new Dd()), t);
      case 22:
        return (
          (e = e.stateNode),
          (t = e._retryCache),
          t === null && (t = e._retryCache = new Dd()),
          t
        );
      default:
        throw Error(c(435, e.tag));
    }
  }
  function ds(e, t) {
    var a = Ng(e);
    t.forEach(function (l) {
      if (!a.has(l)) {
        a.add(l);
        var i = kg.bind(null, e, l);
        l.then(i, i);
      }
    });
  }
  function xt(e, t) {
    var a = t.deletions;
    if (a !== null)
      for (var l = 0; l < a.length; l++) {
        var i = a[l],
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
        (Bd(s, o, i),
          (Ze = null),
          (vt = !1),
          (s = i.alternate),
          s !== null && (s.return = null),
          (i.return = null));
      }
    if (t.subtreeFlags & 13886)
      for (t = t.child; t !== null; ) (Ld(t, e), (t = t.sibling));
  }
  var Kt = null;
  function Ld(e, t) {
    var a = e.alternate,
      l = e.flags;
    switch (e.tag) {
      case 0:
      case 11:
      case 14:
      case 15:
        (xt(t, e),
          St(e),
          l & 4 && (Ya(3, e, e.return), Wn(3, e), Ya(5, e, e.return)));
        break;
      case 1:
        (xt(t, e),
          St(e),
          l & 512 && (tt || a === null || It(a, a.return)),
          l & 64 &&
            ga &&
            ((e = e.updateQueue),
            e !== null &&
              ((l = e.callbacks),
              l !== null &&
                ((a = e.shared.hiddenCallbacks),
                (e.shared.hiddenCallbacks = a === null ? l : a.concat(l))))));
        break;
      case 26:
        var i = Kt;
        if (
          (xt(t, e),
          St(e),
          l & 512 && (tt || a === null || It(a, a.return)),
          l & 4)
        ) {
          var s = a !== null ? a.memoizedState : null;
          if (((l = e.memoizedState), a === null))
            if (l === null)
              if (e.stateNode === null) {
                e: {
                  ((l = e.type),
                    (a = e.memoizedProps),
                    (i = i.ownerDocument || i));
                  t: switch (l) {
                    case 'title':
                      ((s = i.getElementsByTagName('title')[0]),
                        (!s ||
                          s[An] ||
                          s[ct] ||
                          s.namespaceURI === 'http://www.w3.org/2000/svg' ||
                          s.hasAttribute('itemprop')) &&
                          ((s = i.createElement(l)),
                          i.head.insertBefore(
                            s,
                            i.querySelector('head > title'),
                          )),
                        mt(s, l, a),
                        (s[ct] = e),
                        it(s),
                        (l = s));
                      break e;
                    case 'link':
                      var o = Lm('link', 'href', i).get(l + (a.href || ''));
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
                      ((s = i.createElement(l)),
                        mt(s, l, a),
                        i.head.appendChild(s));
                      break;
                    case 'meta':
                      if (
                        (o = Lm('meta', 'content', i).get(
                          l + (a.content || ''),
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
                      ((s = i.createElement(l)),
                        mt(s, l, a),
                        i.head.appendChild(s));
                      break;
                    default:
                      throw Error(c(468, l));
                  }
                  ((s[ct] = e), it(s), (l = s));
                }
                e.stateNode = l;
              } else Ym(i, e.type, e.stateNode);
            else e.stateNode = qm(i, l, e.memoizedProps);
          else
            s !== l
              ? (s === null
                  ? a.stateNode !== null &&
                    ((a = a.stateNode), a.parentNode.removeChild(a))
                  : s.count--,
                l === null
                  ? Ym(i, e.type, e.stateNode)
                  : qm(i, l, e.memoizedProps))
              : l === null &&
                e.stateNode !== null &&
                Mu(e, e.memoizedProps, a.memoizedProps);
        }
        break;
      case 27:
        (xt(t, e),
          St(e),
          l & 512 && (tt || a === null || It(a, a.return)),
          a !== null && l & 4 && Mu(e, e.memoizedProps, a.memoizedProps));
        break;
      case 5:
        if (
          (xt(t, e),
          St(e),
          l & 512 && (tt || a === null || It(a, a.return)),
          e.flags & 32)
        ) {
          i = e.stateNode;
          try {
            Hl(i, '');
          } catch (ie) {
            De(e, e.return, ie);
          }
        }
        (l & 4 &&
          e.stateNode != null &&
          ((i = e.memoizedProps), Mu(e, i, a !== null ? a.memoizedProps : i)),
          l & 1024 && (ku = !0));
        break;
      case 6:
        if ((xt(t, e), St(e), l & 4)) {
          if (e.stateNode === null) throw Error(c(162));
          ((l = e.memoizedProps), (a = e.stateNode));
          try {
            a.nodeValue = l;
          } catch (ie) {
            De(e, e.return, ie);
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
          l & 4 && a !== null && a.memoizedState.isDehydrated)
        )
          try {
            pn(t.containerInfo);
          } catch (ie) {
            De(e, e.return, ie);
          }
        ku && ((ku = !1), Yd(e));
        break;
      case 4:
        ((l = Kt),
          (Kt = js(e.stateNode.containerInfo)),
          xt(t, e),
          St(e),
          (Kt = l));
        break;
      case 12:
        (xt(t, e), St(e));
        break;
      case 31:
        (xt(t, e),
          St(e),
          l & 4 &&
            ((l = e.updateQueue),
            l !== null && ((e.updateQueue = null), ds(e, l))));
        break;
      case 13:
        (xt(t, e),
          St(e),
          e.child.flags & 8192 &&
            (e.memoizedState !== null) !=
              (a !== null && a.memoizedState !== null) &&
            (hs = At()),
          l & 4 &&
            ((l = e.updateQueue),
            l !== null && ((e.updateQueue = null), ds(e, l))));
        break;
      case 22:
        i = e.memoizedState !== null;
        var E = a !== null && a.memoizedState !== null,
          _ = ga,
          k = tt;
        if (
          ((ga = _ || i),
          (tt = k || E),
          xt(t, e),
          (tt = k),
          (ga = _),
          St(e),
          l & 8192)
        )
          e: for (
            t = e.stateNode,
              t._visibility = i ? t._visibility & -2 : t._visibility | 1,
              i && (a === null || E || ga || tt || Tl(e)),
              a = null,
              t = e;
            ;
          ) {
            if (t.tag === 5 || t.tag === 26) {
              if (a === null) {
                E = a = t;
                try {
                  if (((s = E.stateNode), i))
                    ((o = s.style),
                      typeof o.setProperty == 'function'
                        ? o.setProperty('display', 'none', 'important')
                        : (o.display = 'none'));
                  else {
                    y = E.stateNode;
                    var Y = E.memoizedProps.style,
                      O =
                        Y != null && Y.hasOwnProperty('display')
                          ? Y.display
                          : null;
                    y.style.display =
                      O == null || typeof O == 'boolean' ? '' : ('' + O).trim();
                  }
                } catch (ie) {
                  De(E, E.return, ie);
                }
              }
            } else if (t.tag === 6) {
              if (a === null) {
                E = t;
                try {
                  E.stateNode.nodeValue = i ? '' : E.memoizedProps;
                } catch (ie) {
                  De(E, E.return, ie);
                }
              }
            } else if (t.tag === 18) {
              if (a === null) {
                E = t;
                try {
                  var D = E.stateNode;
                  i ? _m(D, !0) : _m(E.stateNode, !1);
                } catch (ie) {
                  De(E, E.return, ie);
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
        l & 4 &&
          ((l = e.updateQueue),
          l !== null &&
            ((a = l.retryQueue),
            a !== null && ((l.retryQueue = null), ds(e, a))));
        break;
      case 19:
        (xt(t, e),
          St(e),
          l & 4 &&
            ((l = e.updateQueue),
            l !== null && ((e.updateQueue = null), ds(e, l))));
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
        for (var a, l = e.return; l !== null; ) {
          if (Od(l)) {
            a = l;
            break;
          }
          l = l.return;
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
            a.flags & 32 && (Hl(o, ''), (a.flags &= -33));
            var y = Du(e);
            fs(e, y, o);
            break;
          case 3:
          case 4:
            var E = a.stateNode.containerInfo,
              _ = Du(e);
            Uu(e, _, E);
            break;
          default:
            throw Error(c(161));
        }
      } catch (k) {
        De(e, e.return, k);
      }
      e.flags &= -3;
    }
    t & 4096 && (e.flags &= -4097);
  }
  function Yd(e) {
    if (e.subtreeFlags & 1024)
      for (e = e.child; e !== null; ) {
        var t = e;
        (Yd(t),
          t.tag === 5 && t.flags & 1024 && t.stateNode.reset(),
          (e = e.sibling));
      }
  }
  function va(e, t) {
    if (t.subtreeFlags & 8772)
      for (t = t.child; t !== null; ) (Ud(e, t.alternate, t), (t = t.sibling));
  }
  function Tl(e) {
    for (e = e.child; e !== null; ) {
      var t = e;
      switch (t.tag) {
        case 0:
        case 11:
        case 14:
        case 15:
          (Ya(4, t, t.return), Tl(t));
          break;
        case 1:
          It(t, t.return);
          var a = t.stateNode;
          (typeof a.componentWillUnmount == 'function' && _d(t, t.return, a),
            Tl(t));
          break;
        case 27:
          si(t.stateNode);
        case 26:
        case 5:
          (It(t, t.return), Tl(t));
          break;
        case 22:
          t.memoizedState === null && Tl(t);
          break;
        case 30:
          Tl(t);
          break;
        default:
          Tl(t);
      }
      e = e.sibling;
    }
  }
  function xa(e, t, a) {
    for (a = a && (t.subtreeFlags & 8772) !== 0, t = t.child; t !== null; ) {
      var l = t.alternate,
        i = e,
        s = t,
        o = s.flags;
      switch (s.tag) {
        case 0:
        case 11:
        case 15:
          (xa(i, s, a), Wn(4, s));
          break;
        case 1:
          if (
            (xa(i, s, a),
            (l = s),
            (i = l.stateNode),
            typeof i.componentDidMount == 'function')
          )
            try {
              i.componentDidMount();
            } catch (_) {
              De(l, l.return, _);
            }
          if (((l = s), (i = l.updateQueue), i !== null)) {
            var y = l.stateNode;
            try {
              var E = i.shared.hiddenCallbacks;
              if (E !== null)
                for (i.shared.hiddenCallbacks = null, i = 0; i < E.length; i++)
                  bf(E[i], y);
            } catch (_) {
              De(l, l.return, _);
            }
          }
          (a && o & 64 && zd(s), Fn(s, s.return));
          break;
        case 27:
          Md(s);
        case 26:
        case 5:
          (xa(i, s, a), a && l === null && o & 4 && Cd(s), Fn(s, s.return));
          break;
        case 12:
          xa(i, s, a);
          break;
        case 31:
          (xa(i, s, a), a && o & 4 && Hd(i, s));
          break;
        case 13:
          (xa(i, s, a), a && o & 4 && qd(i, s));
          break;
        case 22:
          (s.memoizedState === null && xa(i, s, a), Fn(s, s.return));
          break;
        case 30:
          break;
        default:
          xa(i, s, a);
      }
      t = t.sibling;
    }
  }
  function Bu(e, t) {
    var a = null;
    (e !== null &&
      e.memoizedState !== null &&
      e.memoizedState.cachePool !== null &&
      (a = e.memoizedState.cachePool.pool),
      (e = null),
      t.memoizedState !== null &&
        t.memoizedState.cachePool !== null &&
        (e = t.memoizedState.cachePool.pool),
      e !== a && (e != null && e.refCount++, a != null && Bn(a)));
  }
  function Hu(e, t) {
    ((e = null),
      t.alternate !== null && (e = t.alternate.memoizedState.cache),
      (t = t.memoizedState.cache),
      t !== e && (t.refCount++, e != null && Bn(e)));
  }
  function Jt(e, t, a, l) {
    if (t.subtreeFlags & 10256)
      for (t = t.child; t !== null; ) (Gd(e, t, a, l), (t = t.sibling));
  }
  function Gd(e, t, a, l) {
    var i = t.flags;
    switch (t.tag) {
      case 0:
      case 11:
      case 15:
        (Jt(e, t, a, l), i & 2048 && Wn(9, t));
        break;
      case 1:
        Jt(e, t, a, l);
        break;
      case 3:
        (Jt(e, t, a, l),
          i & 2048 &&
            ((e = null),
            t.alternate !== null && (e = t.alternate.memoizedState.cache),
            (t = t.memoizedState.cache),
            t !== e && (t.refCount++, e != null && Bn(e))));
        break;
      case 12:
        if (i & 2048) {
          (Jt(e, t, a, l), (e = t.stateNode));
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
          } catch (E) {
            De(t, t.return, E);
          }
        } else Jt(e, t, a, l);
        break;
      case 31:
        Jt(e, t, a, l);
        break;
      case 13:
        Jt(e, t, a, l);
        break;
      case 23:
        break;
      case 22:
        ((s = t.stateNode),
          (o = t.alternate),
          t.memoizedState !== null
            ? s._visibility & 2
              ? Jt(e, t, a, l)
              : In(e, t)
            : s._visibility & 2
              ? Jt(e, t, a, l)
              : ((s._visibility |= 2),
                nn(e, t, a, l, (t.subtreeFlags & 10256) !== 0 || !1)),
          i & 2048 && Bu(o, t));
        break;
      case 24:
        (Jt(e, t, a, l), i & 2048 && Hu(t.alternate, t));
        break;
      default:
        Jt(e, t, a, l);
    }
  }
  function nn(e, t, a, l, i) {
    for (
      i = i && ((t.subtreeFlags & 10256) !== 0 || !1), t = t.child;
      t !== null;
    ) {
      var s = e,
        o = t,
        y = a,
        E = l,
        _ = o.flags;
      switch (o.tag) {
        case 0:
        case 11:
        case 15:
          (nn(s, o, y, E, i), Wn(8, o));
          break;
        case 23:
          break;
        case 22:
          var k = o.stateNode;
          (o.memoizedState !== null
            ? k._visibility & 2
              ? nn(s, o, y, E, i)
              : In(s, o)
            : ((k._visibility |= 2), nn(s, o, y, E, i)),
            i && _ & 2048 && Bu(o.alternate, o));
          break;
        case 24:
          (nn(s, o, y, E, i), i && _ & 2048 && Hu(o.alternate, o));
          break;
        default:
          nn(s, o, y, E, i);
      }
      t = t.sibling;
    }
  }
  function In(e, t) {
    if (t.subtreeFlags & 10256)
      for (t = t.child; t !== null; ) {
        var a = e,
          l = t,
          i = l.flags;
        switch (l.tag) {
          case 22:
            (In(a, l), i & 2048 && Bu(l.alternate, l));
            break;
          case 24:
            (In(a, l), i & 2048 && Hu(l.alternate, l));
            break;
          default:
            In(a, l);
        }
        t = t.sibling;
      }
  }
  var Pn = 8192;
  function sn(e, t, a) {
    if (e.subtreeFlags & Pn)
      for (e = e.child; e !== null; ) (Xd(e, t, a), (e = e.sibling));
  }
  function Xd(e, t, a) {
    switch (e.tag) {
      case 26:
        (sn(e, t, a),
          e.flags & Pn &&
            e.memoizedState !== null &&
            mb(a, Kt, e.memoizedState, e.memoizedProps));
        break;
      case 5:
        sn(e, t, a);
        break;
      case 3:
      case 4:
        var l = Kt;
        ((Kt = js(e.stateNode.containerInfo)), sn(e, t, a), (Kt = l));
        break;
      case 22:
        e.memoizedState === null &&
          ((l = e.alternate),
          l !== null && l.memoizedState !== null
            ? ((l = Pn), (Pn = 16777216), sn(e, t, a), (Pn = l))
            : sn(e, t, a));
        break;
      default:
        sn(e, t, a);
    }
  }
  function Zd(e) {
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
          var l = t[a];
          ((st = l), Qd(l, e));
        }
      Zd(e);
    }
    if (e.subtreeFlags & 10256)
      for (e = e.child; e !== null; ) (Vd(e), (e = e.sibling));
  }
  function Vd(e) {
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
          ? ((t._visibility &= -3), ms(e))
          : ei(e);
        break;
      default:
        ei(e);
    }
  }
  function ms(e) {
    var t = e.deletions;
    if ((e.flags & 16) !== 0) {
      if (t !== null)
        for (var a = 0; a < t.length; a++) {
          var l = t[a];
          ((st = l), Qd(l, e));
        }
      Zd(e);
    }
    for (e = e.child; e !== null; ) {
      switch (((t = e), t.tag)) {
        case 0:
        case 11:
        case 15:
          (Ya(8, t, t.return), ms(t));
          break;
        case 22:
          ((a = t.stateNode),
            a._visibility & 2 && ((a._visibility &= -3), ms(t)));
          break;
        default:
          ms(t);
      }
      e = e.sibling;
    }
  }
  function Qd(e, t) {
    for (; st !== null; ) {
      var a = st;
      switch (a.tag) {
        case 0:
        case 11:
        case 15:
          Ya(8, a, t);
          break;
        case 23:
        case 22:
          if (a.memoizedState !== null && a.memoizedState.cachePool !== null) {
            var l = a.memoizedState.cachePool.pool;
            l != null && l.refCount++;
          }
          break;
        case 24:
          Bn(a.memoizedState.cache);
      }
      if (((l = a.child), l !== null)) ((l.return = a), (st = l));
      else
        e: for (a = e; st !== null; ) {
          l = st;
          var i = l.sibling,
            s = l.return;
          if ((kd(l), l === a)) {
            st = null;
            break e;
          }
          if (i !== null) {
            ((i.return = s), (st = i));
            break e;
          }
          st = s;
        }
    }
  }
  var Rg = {
      getCacheForType: function (e) {
        var t = ft(Ie),
          a = t.data.get(e);
        return (a === void 0 && ((a = e()), t.data.set(e, a)), a);
      },
      cacheSignal: function () {
        return ft(Ie).controller.signal;
      },
    },
    zg = typeof WeakMap == 'function' ? WeakMap : Map,
    Oe = 0,
    qe = null,
    Te = null,
    we = 0,
    Me = 0,
    Ct = null,
    Ga = !1,
    rn = !1,
    qu = !1,
    Sa = 0,
    $e = 0,
    Xa = 0,
    Al = 0,
    Lu = 0,
    Ot = 0,
    un = 0,
    ti = null,
    Et = null,
    Yu = !1,
    hs = 0,
    Kd = 0,
    ys = 1 / 0,
    ps = null,
    Za = null,
    lt = 0,
    Va = null,
    cn = null,
    Ea = 0,
    Gu = 0,
    Xu = null,
    Jd = null,
    ai = 0,
    Zu = null;
  function Mt() {
    return (Oe & 2) !== 0 && we !== 0 ? we & -we : R.T !== null ? Wu() : uo();
  }
  function $d() {
    if (Ot === 0)
      if ((we & 536870912) === 0 || Ne) {
        var e = Ai;
        ((Ai <<= 1), (Ai & 3932160) === 0 && (Ai = 262144), (Ot = e));
      } else Ot = 536870912;
    return ((e = zt.current), e !== null && (e.flags |= 32), Ot);
  }
  function Tt(e, t, a) {
    (((e === qe && (Me === 2 || Me === 9)) || e.cancelPendingCommit !== null) &&
      (on(e, 0), Qa(e, we, Ot, !1)),
      Tn(e, a),
      ((Oe & 2) === 0 || e !== qe) &&
        (e === qe &&
          ((Oe & 2) === 0 && (Al |= a), $e === 4 && Qa(e, we, Ot, !1)),
        Pt(e)));
  }
  function Wd(e, t, a) {
    if ((Oe & 6) !== 0) throw Error(c(327));
    var l = (!a && (t & 127) === 0 && (t & e.expiredLanes) === 0) || En(e, t),
      i = l ? Og(e, t) : Qu(e, t, !0),
      s = l;
    do {
      if (i === 0) {
        rn && !l && Qa(e, t, 0, !1);
        break;
      } else {
        if (((a = e.current.alternate), s && !_g(a))) {
          ((i = Qu(e, t, !1)), (s = !1));
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
              var E = y.current.memoizedState.isDehydrated;
              if ((E && (on(y, o).flags |= 256), (o = Qu(y, o, !1)), o !== 2)) {
                if (qu && !E) {
                  ((y.errorRecoveryDisabledLanes |= s), (Al |= s), (i = 4));
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
          (on(e, 0), Qa(e, t, 0, !0));
          break;
        }
        e: {
          switch (((l = e), (s = i), s)) {
            case 0:
            case 1:
              throw Error(c(345));
            case 4:
              if ((t & 4194048) !== t) break;
            case 6:
              Qa(l, t, Ot, !Ga);
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
          if ((t & 62914560) === t && ((i = hs + 300 - At()), 10 < i)) {
            if ((Qa(l, t, Ot, !Ga), ji(l, 0, !0) !== 0)) break e;
            ((Ea = t),
              (l.timeoutHandle = Nm(
                Fd.bind(
                  null,
                  l,
                  a,
                  Et,
                  ps,
                  Yu,
                  t,
                  Ot,
                  Al,
                  un,
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
          Fd(l, a, Et, ps, Yu, t, Ot, Al, un, Ga, s, null, -0, 0);
        }
      }
      break;
    } while (!0);
    Pt(e);
  }
  function Fd(e, t, a, l, i, s, o, y, E, _, k, Y, O, D) {
    if (
      ((e.timeoutHandle = -1),
      (Y = t.subtreeFlags),
      Y & 8192 || (Y & 16785408) === 16785408)
    ) {
      ((Y = {
        stylesheets: null,
        count: 0,
        imgCount: 0,
        imgBytes: 0,
        suspenseyImages: [],
        waitingForImages: !0,
        waitingForViewTransition: !1,
        unsuspend: ra,
      }),
        Xd(t, s, Y));
      var ie =
        (s & 62914560) === s ? hs - At() : (s & 4194048) === s ? Kd - At() : 0;
      if (((ie = hb(Y, ie)), ie !== null)) {
        ((Ea = s),
          (e.cancelPendingCommit = ie(
            im.bind(null, e, t, s, a, l, i, o, y, E, k, Y, null, O, D),
          )),
          Qa(e, s, o, !_));
        return;
      }
    }
    im(e, t, s, a, l, i, o, y, E);
  }
  function _g(e) {
    for (var t = e; ; ) {
      var a = t.tag;
      if (
        (a === 0 || a === 11 || a === 15) &&
        t.flags & 16384 &&
        ((a = t.updateQueue), a !== null && ((a = a.stores), a !== null))
      )
        for (var l = 0; l < a.length; l++) {
          var i = a[l],
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
  function Qa(e, t, a, l) {
    ((t &= ~Lu),
      (t &= ~Al),
      (e.suspendedLanes |= t),
      (e.pingedLanes &= ~t),
      l && (e.warmLanes |= t),
      (l = e.expirationTimes));
    for (var i = t; 0 < i; ) {
      var s = 31 - jt(i),
        o = 1 << s;
      ((l[s] = -1), (i &= ~o));
    }
    a !== 0 && io(e, a, t);
  }
  function gs() {
    return (Oe & 6) === 0 ? (li(0), !1) : !0;
  }
  function Vu() {
    if (Te !== null) {
      if (Me === 0) var e = Te.return;
      else ((e = Te), (fa = yl = null), ru(e), (Pl = null), (qn = 0), (e = Te));
      for (; e !== null; ) (Rd(e.alternate, e), (e = e.return));
      Te = null;
    }
  }
  function on(e, t) {
    var a = e.timeoutHandle;
    (a !== -1 && ((e.timeoutHandle = -1), Wg(a)),
      (a = e.cancelPendingCommit),
      a !== null && ((e.cancelPendingCommit = null), a()),
      (Ea = 0),
      Vu(),
      (qe = e),
      (Te = a = ca(e.current, null)),
      (we = t),
      (Me = 0),
      (Ct = null),
      (Ga = !1),
      (rn = En(e, t)),
      (qu = !1),
      (un = Ot = Lu = Al = Xa = $e = 0),
      (Et = ti = null),
      (Yu = !1),
      (t & 8) !== 0 && (t |= t & 32));
    var l = e.entangledLanes;
    if (l !== 0)
      for (e = e.entanglements, l &= t; 0 < l; ) {
        var i = 31 - jt(l),
          s = 1 << i;
        ((t |= e[i]), (l &= ~s));
      }
    return ((Sa = t), Hi(), a);
  }
  function Id(e, t) {
    ((ve = null),
      (R.H = Kn),
      t === Il || t === Qi
        ? ((t = hf()), (Me = 3))
        : t === $r
          ? ((t = hf()), (Me = 4))
          : (Me =
              t === Tu
                ? 8
                : t !== null &&
                    typeof t == 'object' &&
                    typeof t.then == 'function'
                  ? 6
                  : 1),
      (Ct = t),
      Te === null && (($e = 1), ss(e, Ht(t, e.current))));
  }
  function Pd() {
    var e = zt.current;
    return e === null
      ? !0
      : (we & 4194048) === we
        ? Gt === null
        : (we & 62914560) === we || (we & 536870912) !== 0
          ? e === Gt
          : !1;
  }
  function em() {
    var e = R.H;
    return ((R.H = Kn), e === null ? Kn : e);
  }
  function tm() {
    var e = R.A;
    return ((R.A = Rg), e);
  }
  function bs() {
    (($e = 4),
      Ga || ((we & 4194048) !== we && zt.current !== null) || (rn = !0),
      ((Xa & 134217727) === 0 && (Al & 134217727) === 0) ||
        qe === null ||
        Qa(qe, we, Ot, !1));
  }
  function Qu(e, t, a) {
    var l = Oe;
    Oe |= 2;
    var i = em(),
      s = tm();
    ((qe !== e || we !== t) && ((ps = null), on(e, t)), (t = !1));
    var o = $e;
    e: do
      try {
        if (Me !== 0 && Te !== null) {
          var y = Te,
            E = Ct;
          switch (Me) {
            case 8:
              (Vu(), (o = 6));
              break e;
            case 3:
            case 2:
            case 9:
            case 6:
              zt.current === null && (t = !0);
              var _ = Me;
              if (((Me = 0), (Ct = null), fn(e, y, E, _), a && rn)) {
                o = 0;
                break e;
              }
              break;
            default:
              ((_ = Me), (Me = 0), (Ct = null), fn(e, y, E, _));
          }
        }
        (Cg(), (o = $e));
        break;
      } catch (k) {
        Id(e, k);
      }
    while (!0);
    return (
      t && e.shellSuspendCounter++,
      (fa = yl = null),
      (Oe = l),
      (R.H = i),
      (R.A = s),
      Te === null && ((qe = null), (we = 0), Hi()),
      o
    );
  }
  function Cg() {
    for (; Te !== null; ) am(Te);
  }
  function Og(e, t) {
    var a = Oe;
    Oe |= 2;
    var l = em(),
      i = tm();
    qe !== e || we !== t
      ? ((ps = null), (ys = At() + 500), on(e, t))
      : (rn = En(e, t));
    e: do
      try {
        if (Me !== 0 && Te !== null) {
          t = Te;
          var s = Ct;
          t: switch (Me) {
            case 1:
              ((Me = 0), (Ct = null), fn(e, t, s, 1));
              break;
            case 2:
            case 9:
              if (df(s)) {
                ((Me = 0), (Ct = null), lm(t));
                break;
              }
              ((t = function () {
                ((Me !== 2 && Me !== 9) || qe !== e || (Me = 7), Pt(e));
              }),
                s.then(t, t));
              break e;
            case 3:
              Me = 7;
              break e;
            case 4:
              Me = 5;
              break e;
            case 7:
              df(s)
                ? ((Me = 0), (Ct = null), lm(t))
                : ((Me = 0), (Ct = null), fn(e, t, s, 7));
              break;
            case 5:
              var o = null;
              switch (Te.tag) {
                case 26:
                  o = Te.memoizedState;
                case 5:
                case 27:
                  var y = Te;
                  if (o ? Gm(o) : y.stateNode.complete) {
                    ((Me = 0), (Ct = null));
                    var E = y.sibling;
                    if (E !== null) Te = E;
                    else {
                      var _ = y.return;
                      _ !== null ? ((Te = _), vs(_)) : (Te = null);
                    }
                    break t;
                  }
              }
              ((Me = 0), (Ct = null), fn(e, t, s, 5));
              break;
            case 6:
              ((Me = 0), (Ct = null), fn(e, t, s, 6));
              break;
            case 8:
              (Vu(), ($e = 6));
              break e;
            default:
              throw Error(c(462));
          }
        }
        Mg();
        break;
      } catch (k) {
        Id(e, k);
      }
    while (!0);
    return (
      (fa = yl = null),
      (R.H = l),
      (R.A = i),
      (Oe = a),
      Te !== null ? 0 : ((qe = null), (we = 0), Hi(), $e)
    );
  }
  function Mg() {
    for (; Te !== null && !ap(); ) am(Te);
  }
  function am(e) {
    var t = jd(e.alternate, e, Sa);
    ((e.memoizedProps = e.pendingProps), t === null ? vs(e) : (Te = t));
  }
  function lm(e) {
    var t = e,
      a = t.alternate;
    switch (t.tag) {
      case 15:
      case 0:
        t = xd(a, t, t.pendingProps, t.type, void 0, we);
        break;
      case 11:
        t = xd(a, t, t.pendingProps, t.type.render, t.ref, we);
        break;
      case 5:
        ru(t);
      default:
        (Rd(a, t), (t = Te = ef(t, Sa)), (t = jd(a, t, Sa)));
    }
    ((e.memoizedProps = e.pendingProps), t === null ? vs(e) : (Te = t));
  }
  function fn(e, t, a, l) {
    ((fa = yl = null), ru(t), (Pl = null), (qn = 0));
    var i = t.return;
    try {
      if (Sg(e, i, t, a, we)) {
        (($e = 1), ss(e, Ht(a, e.current)), (Te = null));
        return;
      }
    } catch (s) {
      if (i !== null) throw ((Te = i), s);
      (($e = 1), ss(e, Ht(a, e.current)), (Te = null));
      return;
    }
    t.flags & 32768
      ? (Ne || l === 1
          ? (e = !0)
          : rn || (we & 536870912) !== 0
            ? (e = !1)
            : ((Ga = e = !0),
              (l === 2 || l === 9 || l === 3 || l === 6) &&
                ((l = zt.current),
                l !== null && l.tag === 13 && (l.flags |= 16384))),
        nm(t, e))
      : vs(t);
  }
  function vs(e) {
    var t = e;
    do {
      if ((t.flags & 32768) !== 0) {
        nm(t, Ga);
        return;
      }
      e = t.return;
      var a = Ag(t.alternate, t, Sa);
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
  function nm(e, t) {
    do {
      var a = wg(e.alternate, e);
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
  function im(e, t, a, l, i, s, o, y, E) {
    e.cancelPendingCommit = null;
    do xs();
    while (lt !== 0);
    if ((Oe & 6) !== 0) throw Error(c(327));
    if (t !== null) {
      if (t === e.current) throw Error(c(177));
      if (
        ((s = t.lanes | t.childLanes),
        (s |= Dr),
        dp(e, a, s, o, y, E),
        e === qe && ((Te = qe = null), (we = 0)),
        (cn = t),
        (Va = e),
        (Ea = a),
        (Gu = s),
        (Xu = i),
        (Jd = l),
        (t.subtreeFlags & 10256) !== 0 || (t.flags & 10256) !== 0
          ? ((e.callbackNode = null),
            (e.callbackPriority = 0),
            Bg(Ei, function () {
              return (om(), null);
            }))
          : ((e.callbackNode = null), (e.callbackPriority = 0)),
        (l = (t.flags & 13878) !== 0),
        (t.subtreeFlags & 13878) !== 0 || l)
      ) {
        ((l = R.T), (R.T = null), (i = q.p), (q.p = 2), (o = Oe), (Oe |= 4));
        try {
          jg(e, t, a);
        } finally {
          ((Oe = o), (q.p = i), (R.T = l));
        }
      }
      ((lt = 1), sm(), rm(), um());
    }
  }
  function sm() {
    if (lt === 1) {
      lt = 0;
      var e = Va,
        t = cn,
        a = (t.flags & 13878) !== 0;
      if ((t.subtreeFlags & 13878) !== 0 || a) {
        ((a = R.T), (R.T = null));
        var l = q.p;
        q.p = 2;
        var i = Oe;
        Oe |= 4;
        try {
          Ld(t, e);
          var s = nc,
            o = Vo(e.containerInfo),
            y = s.focusedElem,
            E = s.selectionRange;
          if (
            o !== y &&
            y &&
            y.ownerDocument &&
            Zo(y.ownerDocument.documentElement, y)
          ) {
            if (E !== null && zr(y)) {
              var _ = E.start,
                k = E.end;
              if ((k === void 0 && (k = _), 'selectionStart' in y))
                ((y.selectionStart = _),
                  (y.selectionEnd = Math.min(k, y.value.length)));
              else {
                var Y = y.ownerDocument || document,
                  O = (Y && Y.defaultView) || window;
                if (O.getSelection) {
                  var D = O.getSelection(),
                    ie = y.textContent.length,
                    he = Math.min(E.start, ie),
                    He = E.end === void 0 ? he : Math.min(E.end, ie);
                  !D.extend && he > He && ((o = He), (He = he), (he = o));
                  var N = Xo(y, he),
                    j = Xo(y, He);
                  if (
                    N &&
                    j &&
                    (D.rangeCount !== 1 ||
                      D.anchorNode !== N.node ||
                      D.anchorOffset !== N.offset ||
                      D.focusNode !== j.node ||
                      D.focusOffset !== j.offset)
                  ) {
                    var z = Y.createRange();
                    (z.setStart(N.node, N.offset),
                      D.removeAllRanges(),
                      he > He
                        ? (D.addRange(z), D.extend(j.node, j.offset))
                        : (z.setEnd(j.node, j.offset), D.addRange(z)));
                  }
                }
              }
            }
            for (Y = [], D = y; (D = D.parentNode); )
              D.nodeType === 1 &&
                Y.push({ element: D, left: D.scrollLeft, top: D.scrollTop });
            for (
              typeof y.focus == 'function' && y.focus(), y = 0;
              y < Y.length;
              y++
            ) {
              var H = Y[y];
              ((H.element.scrollLeft = H.left), (H.element.scrollTop = H.top));
            }
          }
          ((Os = !!lc), (nc = lc = null));
        } finally {
          ((Oe = i), (q.p = l), (R.T = a));
        }
      }
      ((e.current = t), (lt = 2));
    }
  }
  function rm() {
    if (lt === 2) {
      lt = 0;
      var e = Va,
        t = cn,
        a = (t.flags & 8772) !== 0;
      if ((t.subtreeFlags & 8772) !== 0 || a) {
        ((a = R.T), (R.T = null));
        var l = q.p;
        q.p = 2;
        var i = Oe;
        Oe |= 4;
        try {
          Ud(e, t.alternate, t);
        } finally {
          ((Oe = i), (q.p = l), (R.T = a));
        }
      }
      lt = 3;
    }
  }
  function um() {
    if (lt === 4 || lt === 3) {
      ((lt = 0), lp());
      var e = Va,
        t = cn,
        a = Ea,
        l = Jd;
      (t.subtreeFlags & 10256) !== 0 || (t.flags & 10256) !== 0
        ? (lt = 5)
        : ((lt = 0), (cn = Va = null), cm(e, e.pendingLanes));
      var i = e.pendingLanes;
      if (
        (i === 0 && (Za = null),
        or(a),
        (t = t.stateNode),
        wt && typeof wt.onCommitFiberRoot == 'function')
      )
        try {
          wt.onCommitFiberRoot(Sn, t, void 0, (t.current.flags & 128) === 128);
        } catch {}
      if (l !== null) {
        ((t = R.T), (i = q.p), (q.p = 2), (R.T = null));
        try {
          for (var s = e.onRecoverableError, o = 0; o < l.length; o++) {
            var y = l[o];
            s(y.value, { componentStack: y.stack });
          }
        } finally {
          ((R.T = t), (q.p = i));
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
        li(0));
    }
  }
  function cm(e, t) {
    (e.pooledCacheLanes &= t) === 0 &&
      ((t = e.pooledCache), t != null && ((e.pooledCache = null), Bn(t)));
  }
  function xs() {
    return (sm(), rm(), um(), om());
  }
  function om() {
    if (lt !== 5) return !1;
    var e = Va,
      t = Gu;
    Gu = 0;
    var a = or(Ea),
      l = R.T,
      i = q.p;
    try {
      ((q.p = 32 > a ? 32 : a), (R.T = null), (a = Xu), (Xu = null));
      var s = Va,
        o = Ea;
      if (((lt = 0), (cn = Va = null), (Ea = 0), (Oe & 6) !== 0))
        throw Error(c(331));
      var y = Oe;
      if (
        ((Oe |= 4),
        Vd(s.current),
        Gd(s, s.current, o, a),
        (Oe = y),
        li(0, !1),
        wt && typeof wt.onPostCommitFiberRoot == 'function')
      )
        try {
          wt.onPostCommitFiberRoot(Sn, s);
        } catch {}
      return !0;
    } finally {
      ((q.p = i), (R.T = l), cm(e, t));
    }
  }
  function fm(e, t, a) {
    ((t = Ht(a, t)),
      (t = Eu(e.stateNode, t, 2)),
      (e = Ha(e, t, 2)),
      e !== null && (Tn(e, 2), Pt(e)));
  }
  function De(e, t, a) {
    if (e.tag === 3) fm(e, e, a);
    else
      for (; t !== null; ) {
        if (t.tag === 3) {
          fm(t, e, a);
          break;
        } else if (t.tag === 1) {
          var l = t.stateNode;
          if (
            typeof t.type.getDerivedStateFromError == 'function' ||
            (typeof l.componentDidCatch == 'function' &&
              (Za === null || !Za.has(l)))
          ) {
            ((e = Ht(a, e)),
              (a = dd(2)),
              (l = Ha(t, a, 2)),
              l !== null && (md(a, l, t, e), Tn(l, 2), Pt(l)));
            break;
          }
        }
        t = t.return;
      }
  }
  function Ku(e, t, a) {
    var l = e.pingCache;
    if (l === null) {
      l = e.pingCache = new zg();
      var i = new Set();
      l.set(t, i);
    } else ((i = l.get(t)), i === void 0 && ((i = new Set()), l.set(t, i)));
    i.has(a) ||
      ((qu = !0), i.add(a), (e = Dg.bind(null, e, t, a)), t.then(e, e));
  }
  function Dg(e, t, a) {
    var l = e.pingCache;
    (l !== null && l.delete(t),
      (e.pingedLanes |= e.suspendedLanes & a),
      (e.warmLanes &= ~a),
      qe === e &&
        (we & a) === a &&
        ($e === 4 || ($e === 3 && (we & 62914560) === we && 300 > At() - hs)
          ? (Oe & 2) === 0 && on(e, 0)
          : (Lu |= a),
        un === we && (un = 0)),
      Pt(e));
  }
  function dm(e, t) {
    (t === 0 && (t = no()), (e = dl(e, t)), e !== null && (Tn(e, t), Pt(e)));
  }
  function Ug(e) {
    var t = e.memoizedState,
      a = 0;
    (t !== null && (a = t.retryLane), dm(e, a));
  }
  function kg(e, t) {
    var a = 0;
    switch (e.tag) {
      case 31:
      case 13:
        var l = e.stateNode,
          i = e.memoizedState;
        i !== null && (a = i.retryLane);
        break;
      case 19:
        l = e.stateNode;
        break;
      case 22:
        l = e.stateNode._retryCache;
        break;
      default:
        throw Error(c(314));
    }
    (l !== null && l.delete(t), dm(e, a));
  }
  function Bg(e, t) {
    return sr(e, t);
  }
  var Ss = null,
    dn = null,
    Ju = !1,
    Es = !1,
    $u = !1,
    Ka = 0;
  function Pt(e) {
    (e !== dn &&
      e.next === null &&
      (dn === null ? (Ss = dn = e) : (dn = dn.next = e)),
      (Es = !0),
      Ju || ((Ju = !0), qg()));
  }
  function li(e, t) {
    if (!$u && Es) {
      $u = !0;
      do
        for (var a = !1, l = Ss; l !== null; ) {
          if (e !== 0) {
            var i = l.pendingLanes;
            if (i === 0) var s = 0;
            else {
              var o = l.suspendedLanes,
                y = l.pingedLanes;
              ((s = (1 << (31 - jt(42 | e) + 1)) - 1),
                (s &= i & ~(o & ~y)),
                (s = s & 201326741 ? (s & 201326741) | 1 : s ? s | 2 : 0));
            }
            s !== 0 && ((a = !0), pm(l, s));
          } else
            ((s = we),
              (s = ji(
                l,
                l === qe ? s : 0,
                l.cancelPendingCommit !== null || l.timeoutHandle !== -1,
              )),
              (s & 3) === 0 || En(l, s) || ((a = !0), pm(l, s)));
          l = l.next;
        }
      while (a);
      $u = !1;
    }
  }
  function Hg() {
    mm();
  }
  function mm() {
    Es = Ju = !1;
    var e = 0;
    Ka !== 0 && $g() && (e = Ka);
    for (var t = At(), a = null, l = Ss; l !== null; ) {
      var i = l.next,
        s = hm(l, t);
      (s === 0
        ? ((l.next = null),
          a === null ? (Ss = i) : (a.next = i),
          i === null && (dn = a))
        : ((a = l), (e !== 0 || (s & 3) !== 0) && (Es = !0)),
        (l = i));
    }
    ((lt !== 0 && lt !== 5) || li(e), Ka !== 0 && (Ka = 0));
  }
  function hm(e, t) {
    for (
      var a = e.suspendedLanes,
        l = e.pingedLanes,
        i = e.expirationTimes,
        s = e.pendingLanes & -62914561;
      0 < s;
    ) {
      var o = 31 - jt(s),
        y = 1 << o,
        E = i[o];
      (E === -1
        ? ((y & a) === 0 || (y & l) !== 0) && (i[o] = fp(y, t))
        : E <= t && (e.expiredLanes |= y),
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
      (l = e.callbackNode),
      a === 0 ||
        (e === t && (Me === 2 || Me === 9)) ||
        e.cancelPendingCommit !== null)
    )
      return (
        l !== null && l !== null && rr(l),
        (e.callbackNode = null),
        (e.callbackPriority = 0)
      );
    if ((a & 3) === 0 || En(e, a)) {
      if (((t = a & -a), t === e.callbackPriority)) return t;
      switch ((l !== null && rr(l), or(a))) {
        case 2:
        case 8:
          a = ao;
          break;
        case 32:
          a = Ei;
          break;
        case 268435456:
          a = lo;
          break;
        default:
          a = Ei;
      }
      return (
        (l = ym.bind(null, e)),
        (a = sr(a, l)),
        (e.callbackPriority = t),
        (e.callbackNode = a),
        t
      );
    }
    return (
      l !== null && l !== null && rr(l),
      (e.callbackPriority = 2),
      (e.callbackNode = null),
      2
    );
  }
  function ym(e, t) {
    if (lt !== 0 && lt !== 5)
      return ((e.callbackNode = null), (e.callbackPriority = 0), null);
    var a = e.callbackNode;
    if (xs() && e.callbackNode !== a) return null;
    var l = we;
    return (
      (l = ji(
        e,
        e === qe ? l : 0,
        e.cancelPendingCommit !== null || e.timeoutHandle !== -1,
      )),
      l === 0
        ? null
        : (Wd(e, l, t),
          hm(e, At()),
          e.callbackNode != null && e.callbackNode === a
            ? ym.bind(null, e)
            : null)
    );
  }
  function pm(e, t) {
    if (xs()) return null;
    Wd(e, t, !0);
  }
  function qg() {
    Fg(function () {
      (Oe & 6) !== 0 ? sr(to, Hg) : mm();
    });
  }
  function Wu() {
    if (Ka === 0) {
      var e = Wl;
      (e === 0 && ((e = Ti), (Ti <<= 1), (Ti & 261888) === 0 && (Ti = 256)),
        (Ka = e));
    }
    return Ka;
  }
  function gm(e) {
    return e == null || typeof e == 'symbol' || typeof e == 'boolean'
      ? null
      : typeof e == 'function'
        ? e
        : _i('' + e);
  }
  function bm(e, t) {
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
  function Lg(e, t, a, l, i) {
    if (t === 'submit' && a && a.stateNode === i) {
      var s = gm((i[gt] || null).action),
        o = l.submitter;
      o &&
        ((t = (t = o[gt] || null)
          ? gm(t.formAction)
          : o.getAttribute('formAction')),
        t !== null && ((s = t), (o = null)));
      var y = new Di('action', 'action', null, l, i);
      e.push({
        event: y,
        listeners: [
          {
            instance: null,
            listener: function () {
              if (l.defaultPrevented) {
                if (Ka !== 0) {
                  var E = o ? bm(i, o) : new FormData(i);
                  pu(
                    a,
                    { pending: !0, data: E, method: i.method, action: s },
                    null,
                    E,
                  );
                }
              } else
                typeof s == 'function' &&
                  (y.preventDefault(),
                  (E = o ? bm(i, o) : new FormData(i)),
                  pu(
                    a,
                    { pending: !0, data: E, method: i.method, action: s },
                    s,
                    E,
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
      Yg = Iu.toLowerCase(),
      Gg = Iu[0].toUpperCase() + Iu.slice(1);
    Qt(Yg, 'on' + Gg);
  }
  (Qt(Jo, 'onAnimationEnd'),
    Qt($o, 'onAnimationIteration'),
    Qt(Wo, 'onAnimationStart'),
    Qt('dblclick', 'onDoubleClick'),
    Qt('focusin', 'onFocus'),
    Qt('focusout', 'onBlur'),
    Qt(ng, 'onTransitionRun'),
    Qt(ig, 'onTransitionStart'),
    Qt(sg, 'onTransitionCancel'),
    Qt(Fo, 'onTransitionEnd'),
    kl('onMouseEnter', ['mouseout', 'mouseover']),
    kl('onMouseLeave', ['mouseout', 'mouseover']),
    kl('onPointerEnter', ['pointerout', 'pointerover']),
    kl('onPointerLeave', ['pointerout', 'pointerover']),
    ul(
      'onChange',
      'change click focusin focusout input keydown keyup selectionchange'.split(
        ' ',
      ),
    ),
    ul(
      'onSelect',
      'focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange'.split(
        ' ',
      ),
    ),
    ul('onBeforeInput', ['compositionend', 'keypress', 'textInput', 'paste']),
    ul(
      'onCompositionEnd',
      'compositionend focusout keydown keypress keyup mousedown'.split(' '),
    ),
    ul(
      'onCompositionStart',
      'compositionstart focusout keydown keypress keyup mousedown'.split(' '),
    ),
    ul(
      'onCompositionUpdate',
      'compositionupdate focusout keydown keypress keyup mousedown'.split(' '),
    ));
  var ni =
      'abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting'.split(
        ' ',
      ),
    Xg = new Set(
      'beforetoggle cancel close invalid load scroll scrollend toggle'
        .split(' ')
        .concat(ni),
    );
  function vm(e, t) {
    t = (t & 4) !== 0;
    for (var a = 0; a < e.length; a++) {
      var l = e[a],
        i = l.event;
      l = l.listeners;
      e: {
        var s = void 0;
        if (t)
          for (var o = l.length - 1; 0 <= o; o--) {
            var y = l[o],
              E = y.instance,
              _ = y.currentTarget;
            if (((y = y.listener), E !== s && i.isPropagationStopped()))
              break e;
            ((s = y), (i.currentTarget = _));
            try {
              s(i);
            } catch (k) {
              Bi(k);
            }
            ((i.currentTarget = null), (s = E));
          }
        else
          for (o = 0; o < l.length; o++) {
            if (
              ((y = l[o]),
              (E = y.instance),
              (_ = y.currentTarget),
              (y = y.listener),
              E !== s && i.isPropagationStopped())
            )
              break e;
            ((s = y), (i.currentTarget = _));
            try {
              s(i);
            } catch (k) {
              Bi(k);
            }
            ((i.currentTarget = null), (s = E));
          }
      }
    }
  }
  function Ae(e, t) {
    var a = t[fr];
    a === void 0 && (a = t[fr] = new Set());
    var l = e + '__bubble';
    a.has(l) || (xm(t, e, 2, !1), a.add(l));
  }
  function Pu(e, t, a) {
    var l = 0;
    (t && (l |= 4), xm(a, e, l, t));
  }
  var Ts = '_reactListening' + Math.random().toString(36).slice(2);
  function ec(e) {
    if (!e[Ts]) {
      ((e[Ts] = !0),
        fo.forEach(function (a) {
          a !== 'selectionchange' && (Xg.has(a) || Pu(a, !1, e), Pu(a, !0, e));
        }));
      var t = e.nodeType === 9 ? e : e.ownerDocument;
      t === null || t[Ts] || ((t[Ts] = !0), Pu('selectionchange', !1, t));
    }
  }
  function xm(e, t, a, l) {
    switch ($m(t)) {
      case 2:
        var i = gb;
        break;
      case 8:
        i = bb;
        break;
      default:
        i = yc;
    }
    ((a = i.bind(null, t, a, e)),
      (i = void 0),
      !xr ||
        (t !== 'touchstart' && t !== 'touchmove' && t !== 'wheel') ||
        (i = !0),
      l
        ? i !== void 0
          ? e.addEventListener(t, a, { capture: !0, passive: i })
          : e.addEventListener(t, a, !0)
        : i !== void 0
          ? e.addEventListener(t, a, { passive: i })
          : e.addEventListener(t, a, !1));
  }
  function tc(e, t, a, l, i) {
    var s = l;
    if ((t & 1) === 0 && (t & 2) === 0 && l !== null)
      e: for (;;) {
        if (l === null) return;
        var o = l.tag;
        if (o === 3 || o === 4) {
          var y = l.stateNode.containerInfo;
          if (y === i) break;
          if (o === 4)
            for (o = l.return; o !== null; ) {
              var E = o.tag;
              if ((E === 3 || E === 4) && o.stateNode.containerInfo === i)
                return;
              o = o.return;
            }
          for (; y !== null; ) {
            if (((o = Ml(y)), o === null)) return;
            if (((E = o.tag), E === 5 || E === 6 || E === 26 || E === 27)) {
              l = s = o;
              continue e;
            }
            y = y.parentNode;
          }
        }
        l = l.return;
      }
    Ao(function () {
      var _ = s,
        k = br(a),
        Y = [];
      e: {
        var O = Io.get(e);
        if (O !== void 0) {
          var D = Di,
            ie = e;
          switch (e) {
            case 'keypress':
              if (Oi(a) === 0) break e;
            case 'keydown':
            case 'keyup':
              D = kp;
              break;
            case 'focusin':
              ((ie = 'focus'), (D = Ar));
              break;
            case 'focusout':
              ((ie = 'blur'), (D = Ar));
              break;
            case 'beforeblur':
            case 'afterblur':
              D = Ar;
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
              D = No;
              break;
            case 'drag':
            case 'dragend':
            case 'dragenter':
            case 'dragexit':
            case 'dragleave':
            case 'dragover':
            case 'dragstart':
            case 'drop':
              D = Ap;
              break;
            case 'touchcancel':
            case 'touchend':
            case 'touchmove':
            case 'touchstart':
              D = qp;
              break;
            case Jo:
            case $o:
            case Wo:
              D = Np;
              break;
            case Fo:
              D = Yp;
              break;
            case 'scroll':
            case 'scrollend':
              D = Ep;
              break;
            case 'wheel':
              D = Xp;
              break;
            case 'copy':
            case 'cut':
            case 'paste':
              D = zp;
              break;
            case 'gotpointercapture':
            case 'lostpointercapture':
            case 'pointercancel':
            case 'pointerdown':
            case 'pointermove':
            case 'pointerout':
            case 'pointerover':
            case 'pointerup':
              D = zo;
              break;
            case 'toggle':
            case 'beforetoggle':
              D = Vp;
          }
          var he = (t & 4) !== 0,
            He = !he && (e === 'scroll' || e === 'scrollend'),
            N = he ? (O !== null ? O + 'Capture' : null) : O;
          he = [];
          for (var j = _, z; j !== null; ) {
            var H = j;
            if (
              ((z = H.stateNode),
              (H = H.tag),
              (H !== 5 && H !== 26 && H !== 27) ||
                z === null ||
                N === null ||
                ((H = jn(j, N)), H != null && he.push(ii(j, H, z))),
              He)
            )
              break;
            j = j.return;
          }
          0 < he.length &&
            ((O = new D(O, ie, null, a, k)),
            Y.push({ event: O, listeners: he }));
        }
      }
      if ((t & 7) === 0) {
        e: {
          if (
            ((O = e === 'mouseover' || e === 'pointerover'),
            (D = e === 'mouseout' || e === 'pointerout'),
            O &&
              a !== gr &&
              (ie = a.relatedTarget || a.fromElement) &&
              (Ml(ie) || ie[Ol]))
          )
            break e;
          if (
            (D || O) &&
            ((O =
              k.window === k
                ? k
                : (O = k.ownerDocument)
                  ? O.defaultView || O.parentWindow
                  : window),
            D
              ? ((ie = a.relatedTarget || a.toElement),
                (D = _),
                (ie = ie ? Ml(ie) : null),
                ie !== null &&
                  ((He = d(ie)),
                  (he = ie.tag),
                  ie !== He || (he !== 5 && he !== 27 && he !== 6)) &&
                  (ie = null))
              : ((D = null), (ie = _)),
            D !== ie)
          ) {
            if (
              ((he = No),
              (H = 'onMouseLeave'),
              (N = 'onMouseEnter'),
              (j = 'mouse'),
              (e === 'pointerout' || e === 'pointerover') &&
                ((he = zo),
                (H = 'onPointerLeave'),
                (N = 'onPointerEnter'),
                (j = 'pointer')),
              (He = D == null ? O : wn(D)),
              (z = ie == null ? O : wn(ie)),
              (O = new he(H, j + 'leave', D, a, k)),
              (O.target = He),
              (O.relatedTarget = z),
              (H = null),
              Ml(k) === _ &&
                ((he = new he(N, j + 'enter', ie, a, k)),
                (he.target = z),
                (he.relatedTarget = He),
                (H = he)),
              (He = H),
              D && ie)
            )
              t: {
                for (he = Zg, N = D, j = ie, z = 0, H = N; H; H = he(H)) z++;
                H = 0;
                for (var de = j; de; de = he(de)) H++;
                for (; 0 < z - H; ) ((N = he(N)), z--);
                for (; 0 < H - z; ) ((j = he(j)), H--);
                for (; z--; ) {
                  if (N === j || (j !== null && N === j.alternate)) {
                    he = N;
                    break t;
                  }
                  ((N = he(N)), (j = he(j)));
                }
                he = null;
              }
            else he = null;
            (D !== null && Sm(Y, O, D, he, !1),
              ie !== null && He !== null && Sm(Y, He, ie, he, !0));
          }
        }
        e: {
          if (
            ((O = _ ? wn(_) : window),
            (D = O.nodeName && O.nodeName.toLowerCase()),
            D === 'select' || (D === 'input' && O.type === 'file'))
          )
            var _e = Bo;
          else if (Uo(O))
            if (Ho) _e = tg;
            else {
              _e = Pp;
              var oe = Ip;
            }
          else
            ((D = O.nodeName),
              !D ||
              D.toLowerCase() !== 'input' ||
              (O.type !== 'checkbox' && O.type !== 'radio')
                ? _ && pr(_.elementType) && (_e = Bo)
                : (_e = eg));
          if (_e && (_e = _e(e, _))) {
            ko(Y, _e, a, k);
            break e;
          }
          (oe && oe(e, O, _),
            e === 'focusout' &&
              _ &&
              O.type === 'number' &&
              _.memoizedProps.value != null &&
              yr(O, 'number', O.value));
        }
        switch (((oe = _ ? wn(_) : window), e)) {
          case 'focusin':
            (Uo(oe) || oe.contentEditable === 'true') &&
              ((Gl = oe), (_r = _), (Dn = null));
            break;
          case 'focusout':
            Dn = _r = Gl = null;
            break;
          case 'mousedown':
            Cr = !0;
            break;
          case 'contextmenu':
          case 'mouseup':
          case 'dragend':
            ((Cr = !1), Qo(Y, a, k));
            break;
          case 'selectionchange':
            if (lg) break;
          case 'keydown':
          case 'keyup':
            Qo(Y, a, k);
        }
        var xe;
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
          Yl
            ? Mo(e, a) && (je = 'onCompositionEnd')
            : e === 'keydown' &&
              a.keyCode === 229 &&
              (je = 'onCompositionStart');
        (je &&
          (_o &&
            a.locale !== 'ko' &&
            (Yl || je !== 'onCompositionStart'
              ? je === 'onCompositionEnd' && Yl && (xe = wo())
              : ((Ca = k),
                (Sr = 'value' in Ca ? Ca.value : Ca.textContent),
                (Yl = !0))),
          (oe = As(_, je)),
          0 < oe.length &&
            ((je = new Ro(je, e, null, a, k)),
            Y.push({ event: je, listeners: oe }),
            xe
              ? (je.data = xe)
              : ((xe = Do(a)), xe !== null && (je.data = xe)))),
          (xe = Kp ? Jp(e, a) : $p(e, a)) &&
            ((je = As(_, 'onBeforeInput')),
            0 < je.length &&
              ((oe = new Ro('onBeforeInput', 'beforeinput', null, a, k)),
              Y.push({ event: oe, listeners: je }),
              (oe.data = xe))),
          Lg(Y, e, _, a, k));
      }
      vm(Y, t);
    });
  }
  function ii(e, t, a) {
    return { instance: e, listener: t, currentTarget: a };
  }
  function As(e, t) {
    for (var a = t + 'Capture', l = []; e !== null; ) {
      var i = e,
        s = i.stateNode;
      if (
        ((i = i.tag),
        (i !== 5 && i !== 26 && i !== 27) ||
          s === null ||
          ((i = jn(e, a)),
          i != null && l.unshift(ii(e, i, s)),
          (i = jn(e, t)),
          i != null && l.push(ii(e, i, s))),
        e.tag === 3)
      )
        return l;
      e = e.return;
    }
    return [];
  }
  function Zg(e) {
    if (e === null) return null;
    do e = e.return;
    while (e && e.tag !== 5 && e.tag !== 27);
    return e || null;
  }
  function Sm(e, t, a, l, i) {
    for (var s = t._reactName, o = []; a !== null && a !== l; ) {
      var y = a,
        E = y.alternate,
        _ = y.stateNode;
      if (((y = y.tag), E !== null && E === l)) break;
      ((y !== 5 && y !== 26 && y !== 27) ||
        _ === null ||
        ((E = _),
        i
          ? ((_ = jn(a, s)), _ != null && o.unshift(ii(a, _, E)))
          : i || ((_ = jn(a, s)), _ != null && o.push(ii(a, _, E)))),
        (a = a.return));
    }
    o.length !== 0 && e.push({ event: t, listeners: o });
  }
  var Vg = /\r\n?/g,
    Qg = /\u0000|\uFFFD/g;
  function Em(e) {
    return (typeof e == 'string' ? e : '' + e)
      .replace(
        Vg,
        `
`,
      )
      .replace(Qg, '');
  }
  function Tm(e, t) {
    return ((t = Em(t)), Em(e) === t);
  }
  function Be(e, t, a, l, i, s) {
    switch (a) {
      case 'children':
        typeof l == 'string'
          ? t === 'body' || (t === 'textarea' && l === '') || Hl(e, l)
          : (typeof l == 'number' || typeof l == 'bigint') &&
            t !== 'body' &&
            Hl(e, '' + l);
        break;
      case 'className':
        Ri(e, 'class', l);
        break;
      case 'tabIndex':
        Ri(e, 'tabindex', l);
        break;
      case 'dir':
      case 'role':
      case 'viewBox':
      case 'width':
      case 'height':
        Ri(e, a, l);
        break;
      case 'style':
        Eo(e, l, s);
        break;
      case 'data':
        if (t !== 'object') {
          Ri(e, 'data', l);
          break;
        }
      case 'src':
      case 'href':
        if (l === '' && (t !== 'a' || a !== 'href')) {
          e.removeAttribute(a);
          break;
        }
        if (
          l == null ||
          typeof l == 'function' ||
          typeof l == 'symbol' ||
          typeof l == 'boolean'
        ) {
          e.removeAttribute(a);
          break;
        }
        ((l = _i('' + l)), e.setAttribute(a, l));
        break;
      case 'action':
      case 'formAction':
        if (typeof l == 'function') {
          e.setAttribute(
            a,
            "javascript:throw new Error('A React form was unexpectedly submitted. If you called form.submit() manually, consider using form.requestSubmit() instead. If you\\'re trying to use event.stopPropagation() in a submit event handler, consider also calling event.preventDefault().')",
          );
          break;
        } else
          typeof s == 'function' &&
            (a === 'formAction'
              ? (t !== 'input' && Be(e, t, 'name', i.name, i, null),
                Be(e, t, 'formEncType', i.formEncType, i, null),
                Be(e, t, 'formMethod', i.formMethod, i, null),
                Be(e, t, 'formTarget', i.formTarget, i, null))
              : (Be(e, t, 'encType', i.encType, i, null),
                Be(e, t, 'method', i.method, i, null),
                Be(e, t, 'target', i.target, i, null)));
        if (l == null || typeof l == 'symbol' || typeof l == 'boolean') {
          e.removeAttribute(a);
          break;
        }
        ((l = _i('' + l)), e.setAttribute(a, l));
        break;
      case 'onClick':
        l != null && (e.onclick = ra);
        break;
      case 'onScroll':
        l != null && Ae('scroll', e);
        break;
      case 'onScrollEnd':
        l != null && Ae('scrollend', e);
        break;
      case 'dangerouslySetInnerHTML':
        if (l != null) {
          if (typeof l != 'object' || !('__html' in l)) throw Error(c(61));
          if (((a = l.__html), a != null)) {
            if (i.children != null) throw Error(c(60));
            e.innerHTML = a;
          }
        }
        break;
      case 'multiple':
        e.multiple = l && typeof l != 'function' && typeof l != 'symbol';
        break;
      case 'muted':
        e.muted = l && typeof l != 'function' && typeof l != 'symbol';
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
          l == null ||
          typeof l == 'function' ||
          typeof l == 'boolean' ||
          typeof l == 'symbol'
        ) {
          e.removeAttribute('xlink:href');
          break;
        }
        ((a = _i('' + l)),
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
        l != null && typeof l != 'function' && typeof l != 'symbol'
          ? e.setAttribute(a, '' + l)
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
        l && typeof l != 'function' && typeof l != 'symbol'
          ? e.setAttribute(a, '')
          : e.removeAttribute(a);
        break;
      case 'capture':
      case 'download':
        l === !0
          ? e.setAttribute(a, '')
          : l !== !1 &&
              l != null &&
              typeof l != 'function' &&
              typeof l != 'symbol'
            ? e.setAttribute(a, l)
            : e.removeAttribute(a);
        break;
      case 'cols':
      case 'rows':
      case 'size':
      case 'span':
        l != null &&
        typeof l != 'function' &&
        typeof l != 'symbol' &&
        !isNaN(l) &&
        1 <= l
          ? e.setAttribute(a, l)
          : e.removeAttribute(a);
        break;
      case 'rowSpan':
      case 'start':
        l == null || typeof l == 'function' || typeof l == 'symbol' || isNaN(l)
          ? e.removeAttribute(a)
          : e.setAttribute(a, l);
        break;
      case 'popover':
        (Ae('beforetoggle', e), Ae('toggle', e), Ni(e, 'popover', l));
        break;
      case 'xlinkActuate':
        sa(e, 'http://www.w3.org/1999/xlink', 'xlink:actuate', l);
        break;
      case 'xlinkArcrole':
        sa(e, 'http://www.w3.org/1999/xlink', 'xlink:arcrole', l);
        break;
      case 'xlinkRole':
        sa(e, 'http://www.w3.org/1999/xlink', 'xlink:role', l);
        break;
      case 'xlinkShow':
        sa(e, 'http://www.w3.org/1999/xlink', 'xlink:show', l);
        break;
      case 'xlinkTitle':
        sa(e, 'http://www.w3.org/1999/xlink', 'xlink:title', l);
        break;
      case 'xlinkType':
        sa(e, 'http://www.w3.org/1999/xlink', 'xlink:type', l);
        break;
      case 'xmlBase':
        sa(e, 'http://www.w3.org/XML/1998/namespace', 'xml:base', l);
        break;
      case 'xmlLang':
        sa(e, 'http://www.w3.org/XML/1998/namespace', 'xml:lang', l);
        break;
      case 'xmlSpace':
        sa(e, 'http://www.w3.org/XML/1998/namespace', 'xml:space', l);
        break;
      case 'is':
        Ni(e, 'is', l);
        break;
      case 'innerText':
      case 'textContent':
        break;
      default:
        (!(2 < a.length) ||
          (a[0] !== 'o' && a[0] !== 'O') ||
          (a[1] !== 'n' && a[1] !== 'N')) &&
          ((a = xp.get(a) || a), Ni(e, a, l));
    }
  }
  function ac(e, t, a, l, i, s) {
    switch (a) {
      case 'style':
        Eo(e, l, s);
        break;
      case 'dangerouslySetInnerHTML':
        if (l != null) {
          if (typeof l != 'object' || !('__html' in l)) throw Error(c(61));
          if (((a = l.__html), a != null)) {
            if (i.children != null) throw Error(c(60));
            e.innerHTML = a;
          }
        }
        break;
      case 'children':
        typeof l == 'string'
          ? Hl(e, l)
          : (typeof l == 'number' || typeof l == 'bigint') && Hl(e, '' + l);
        break;
      case 'onScroll':
        l != null && Ae('scroll', e);
        break;
      case 'onScrollEnd':
        l != null && Ae('scrollend', e);
        break;
      case 'onClick':
        l != null && (e.onclick = ra);
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
        if (!mo.hasOwnProperty(a))
          e: {
            if (
              a[0] === 'o' &&
              a[1] === 'n' &&
              ((i = a.endsWith('Capture')),
              (t = a.slice(2, i ? a.length - 7 : void 0)),
              (s = e[gt] || null),
              (s = s != null ? s[a] : null),
              typeof s == 'function' && e.removeEventListener(t, s, i),
              typeof l == 'function')
            ) {
              (typeof s != 'function' &&
                s !== null &&
                (a in e
                  ? (e[a] = null)
                  : e.hasAttribute(a) && e.removeAttribute(a)),
                e.addEventListener(t, l, i));
              break e;
            }
            a in e
              ? (e[a] = l)
              : l === !0
                ? e.setAttribute(a, '')
                : Ni(e, a, l);
          }
    }
  }
  function mt(e, t, a) {
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
        var l = !1,
          i = !1,
          s;
        for (s in a)
          if (a.hasOwnProperty(s)) {
            var o = a[s];
            if (o != null)
              switch (s) {
                case 'src':
                  l = !0;
                  break;
                case 'srcSet':
                  i = !0;
                  break;
                case 'children':
                case 'dangerouslySetInnerHTML':
                  throw Error(c(137, t));
                default:
                  Be(e, t, s, o, a, null);
              }
          }
        (i && Be(e, t, 'srcSet', a.srcSet, a, null),
          l && Be(e, t, 'src', a.src, a, null));
        return;
      case 'input':
        Ae('invalid', e);
        var y = (s = o = i = null),
          E = null,
          _ = null;
        for (l in a)
          if (a.hasOwnProperty(l)) {
            var k = a[l];
            if (k != null)
              switch (l) {
                case 'name':
                  i = k;
                  break;
                case 'type':
                  o = k;
                  break;
                case 'checked':
                  E = k;
                  break;
                case 'defaultChecked':
                  _ = k;
                  break;
                case 'value':
                  s = k;
                  break;
                case 'defaultValue':
                  y = k;
                  break;
                case 'children':
                case 'dangerouslySetInnerHTML':
                  if (k != null) throw Error(c(137, t));
                  break;
                default:
                  Be(e, t, l, k, a, null);
              }
          }
        bo(e, s, y, E, _, o, i, !1);
        return;
      case 'select':
        (Ae('invalid', e), (l = o = s = null));
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
                l = y;
              default:
                Be(e, t, i, y, a, null);
            }
        ((t = s),
          (a = o),
          (e.multiple = !!l),
          t != null ? Bl(e, !!l, t, !1) : a != null && Bl(e, !!l, a, !0));
        return;
      case 'textarea':
        (Ae('invalid', e), (s = i = l = null));
        for (o in a)
          if (a.hasOwnProperty(o) && ((y = a[o]), y != null))
            switch (o) {
              case 'value':
                l = y;
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
                Be(e, t, o, y, a, null);
            }
        xo(e, l, i, s);
        return;
      case 'option':
        for (E in a)
          if (a.hasOwnProperty(E) && ((l = a[E]), l != null))
            switch (E) {
              case 'selected':
                e.selected =
                  l && typeof l != 'function' && typeof l != 'symbol';
                break;
              default:
                Be(e, t, E, l, a, null);
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
        for (l = 0; l < ni.length; l++) Ae(ni[l], e);
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
        for (_ in a)
          if (a.hasOwnProperty(_) && ((l = a[_]), l != null))
            switch (_) {
              case 'children':
              case 'dangerouslySetInnerHTML':
                throw Error(c(137, t));
              default:
                Be(e, t, _, l, a, null);
            }
        return;
      default:
        if (pr(t)) {
          for (k in a)
            a.hasOwnProperty(k) &&
              ((l = a[k]), l !== void 0 && ac(e, t, k, l, a, void 0));
          return;
        }
    }
    for (y in a)
      a.hasOwnProperty(y) && ((l = a[y]), l != null && Be(e, t, y, l, a, null));
  }
  function Kg(e, t, a, l) {
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
          E = null,
          _ = null,
          k = null;
        for (D in a) {
          var Y = a[D];
          if (a.hasOwnProperty(D) && Y != null)
            switch (D) {
              case 'checked':
                break;
              case 'value':
                break;
              case 'defaultValue':
                E = Y;
              default:
                l.hasOwnProperty(D) || Be(e, t, D, null, l, Y);
            }
        }
        for (var O in l) {
          var D = l[O];
          if (((Y = a[O]), l.hasOwnProperty(O) && (D != null || Y != null)))
            switch (O) {
              case 'type':
                s = D;
                break;
              case 'name':
                i = D;
                break;
              case 'checked':
                _ = D;
                break;
              case 'defaultChecked':
                k = D;
                break;
              case 'value':
                o = D;
                break;
              case 'defaultValue':
                y = D;
                break;
              case 'children':
              case 'dangerouslySetInnerHTML':
                if (D != null) throw Error(c(137, t));
                break;
              default:
                D !== Y && Be(e, t, O, D, l, Y);
            }
        }
        hr(e, o, y, E, _, k, s, i);
        return;
      case 'select':
        D = o = y = O = null;
        for (s in a)
          if (((E = a[s]), a.hasOwnProperty(s) && E != null))
            switch (s) {
              case 'value':
                break;
              case 'multiple':
                D = E;
              default:
                l.hasOwnProperty(s) || Be(e, t, s, null, l, E);
            }
        for (i in l)
          if (
            ((s = l[i]),
            (E = a[i]),
            l.hasOwnProperty(i) && (s != null || E != null))
          )
            switch (i) {
              case 'value':
                O = s;
                break;
              case 'defaultValue':
                y = s;
                break;
              case 'multiple':
                o = s;
              default:
                s !== E && Be(e, t, i, s, l, E);
            }
        ((t = y),
          (a = o),
          (l = D),
          O != null
            ? Bl(e, !!a, O, !1)
            : !!l != !!a &&
              (t != null ? Bl(e, !!a, t, !0) : Bl(e, !!a, a ? [] : '', !1)));
        return;
      case 'textarea':
        D = O = null;
        for (y in a)
          if (
            ((i = a[y]),
            a.hasOwnProperty(y) && i != null && !l.hasOwnProperty(y))
          )
            switch (y) {
              case 'value':
                break;
              case 'children':
                break;
              default:
                Be(e, t, y, null, l, i);
            }
        for (o in l)
          if (
            ((i = l[o]),
            (s = a[o]),
            l.hasOwnProperty(o) && (i != null || s != null))
          )
            switch (o) {
              case 'value':
                O = i;
                break;
              case 'defaultValue':
                D = i;
                break;
              case 'children':
                break;
              case 'dangerouslySetInnerHTML':
                if (i != null) throw Error(c(91));
                break;
              default:
                i !== s && Be(e, t, o, i, l, s);
            }
        vo(e, O, D);
        return;
      case 'option':
        for (var ie in a)
          if (
            ((O = a[ie]),
            a.hasOwnProperty(ie) && O != null && !l.hasOwnProperty(ie))
          )
            switch (ie) {
              case 'selected':
                e.selected = !1;
                break;
              default:
                Be(e, t, ie, null, l, O);
            }
        for (E in l)
          if (
            ((O = l[E]),
            (D = a[E]),
            l.hasOwnProperty(E) && O !== D && (O != null || D != null))
          )
            switch (E) {
              case 'selected':
                e.selected =
                  O && typeof O != 'function' && typeof O != 'symbol';
                break;
              default:
                Be(e, t, E, O, l, D);
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
        for (var he in a)
          ((O = a[he]),
            a.hasOwnProperty(he) &&
              O != null &&
              !l.hasOwnProperty(he) &&
              Be(e, t, he, null, l, O));
        for (_ in l)
          if (
            ((O = l[_]),
            (D = a[_]),
            l.hasOwnProperty(_) && O !== D && (O != null || D != null))
          )
            switch (_) {
              case 'children':
              case 'dangerouslySetInnerHTML':
                if (O != null) throw Error(c(137, t));
                break;
              default:
                Be(e, t, _, O, l, D);
            }
        return;
      default:
        if (pr(t)) {
          for (var He in a)
            ((O = a[He]),
              a.hasOwnProperty(He) &&
                O !== void 0 &&
                !l.hasOwnProperty(He) &&
                ac(e, t, He, void 0, l, O));
          for (k in l)
            ((O = l[k]),
              (D = a[k]),
              !l.hasOwnProperty(k) ||
                O === D ||
                (O === void 0 && D === void 0) ||
                ac(e, t, k, O, l, D));
          return;
        }
    }
    for (var N in a)
      ((O = a[N]),
        a.hasOwnProperty(N) &&
          O != null &&
          !l.hasOwnProperty(N) &&
          Be(e, t, N, null, l, O));
    for (Y in l)
      ((O = l[Y]),
        (D = a[Y]),
        !l.hasOwnProperty(Y) ||
          O === D ||
          (O == null && D == null) ||
          Be(e, t, Y, O, l, D));
  }
  function Am(e) {
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
  function Jg() {
    if (typeof performance.getEntriesByType == 'function') {
      for (
        var e = 0, t = 0, a = performance.getEntriesByType('resource'), l = 0;
        l < a.length;
        l++
      ) {
        var i = a[l],
          s = i.transferSize,
          o = i.initiatorType,
          y = i.duration;
        if (s && y && Am(o)) {
          for (o = 0, y = i.responseEnd, l += 1; l < a.length; l++) {
            var E = a[l],
              _ = E.startTime;
            if (_ > y) break;
            var k = E.transferSize,
              Y = E.initiatorType;
            k &&
              Am(Y) &&
              ((E = E.responseEnd), (o += k * (E < y ? 1 : (y - _) / (E - _))));
          }
          if ((--l, (t += (8 * (s + o)) / (i.duration / 1e3)), e++, 10 < e))
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
  var lc = null,
    nc = null;
  function ws(e) {
    return e.nodeType === 9 ? e : e.ownerDocument;
  }
  function wm(e) {
    switch (e) {
      case 'http://www.w3.org/2000/svg':
        return 1;
      case 'http://www.w3.org/1998/Math/MathML':
        return 2;
      default:
        return 0;
    }
  }
  function jm(e, t) {
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
  function $g() {
    var e = window.event;
    return e && e.type === 'popstate'
      ? e === sc
        ? !1
        : ((sc = e), !0)
      : ((sc = null), !1);
  }
  var Nm = typeof setTimeout == 'function' ? setTimeout : void 0,
    Wg = typeof clearTimeout == 'function' ? clearTimeout : void 0,
    Rm = typeof Promise == 'function' ? Promise : void 0,
    Fg =
      typeof queueMicrotask == 'function'
        ? queueMicrotask
        : typeof Rm < 'u'
          ? function (e) {
              return Rm.resolve(null).then(e).catch(Ig);
            }
          : Nm;
  function Ig(e) {
    setTimeout(function () {
      throw e;
    });
  }
  function Ja(e) {
    return e === 'head';
  }
  function zm(e, t) {
    var a = t,
      l = 0;
    do {
      var i = a.nextSibling;
      if ((e.removeChild(a), i && i.nodeType === 8))
        if (((a = i.data), a === '/$' || a === '/&')) {
          if (l === 0) {
            (e.removeChild(i), pn(t));
            return;
          }
          l--;
        } else if (
          a === '$' ||
          a === '$?' ||
          a === '$~' ||
          a === '$!' ||
          a === '&'
        )
          l++;
        else if (a === 'html') si(e.ownerDocument.documentElement);
        else if (a === 'head') {
          ((a = e.ownerDocument.head), si(a));
          for (var s = a.firstChild; s; ) {
            var o = s.nextSibling,
              y = s.nodeName;
            (s[An] ||
              y === 'SCRIPT' ||
              y === 'STYLE' ||
              (y === 'LINK' && s.rel.toLowerCase() === 'stylesheet') ||
              a.removeChild(s),
              (s = o));
          }
        } else a === 'body' && si(e.ownerDocument.body);
      a = i;
    } while (a);
    pn(t);
  }
  function _m(e, t) {
    var a = e;
    e = 0;
    do {
      var l = a.nextSibling;
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
        l && l.nodeType === 8)
      )
        if (((a = l.data), a === '/$')) {
          if (e === 0) break;
          e--;
        } else (a !== '$' && a !== '$?' && a !== '$~' && a !== '$!') || e++;
      a = l;
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
  function Pg(e, t, a, l) {
    for (; e.nodeType === 1; ) {
      var i = a;
      if (e.nodeName.toLowerCase() !== t.toLowerCase()) {
        if (!l && (e.nodeName !== 'INPUT' || e.type !== 'hidden')) break;
      } else if (l) {
        if (!e[An])
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
  function eb(e, t, a) {
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
  function Cm(e, t) {
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
  function tb(e, t) {
    var a = e.ownerDocument;
    if (e.data === '$~') e._reactRetry = t;
    else if (e.data !== '$?' || a.readyState !== 'loading') t();
    else {
      var l = function () {
        (t(), a.removeEventListener('DOMContentLoaded', l));
      };
      (a.addEventListener('DOMContentLoaded', l), (e._reactRetry = l));
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
  function Om(e) {
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
  function Mm(e) {
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
  function Dm(e, t, a) {
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
    Um = new Set();
  function js(e) {
    return typeof e.getRootNode == 'function'
      ? e.getRootNode()
      : e.nodeType === 9
        ? e
        : e.ownerDocument;
  }
  var Ta = q.d;
  q.d = { f: ab, r: lb, D: nb, C: ib, L: sb, m: rb, X: cb, S: ub, M: ob };
  function ab() {
    var e = Ta.f(),
      t = gs();
    return e || t;
  }
  function lb(e) {
    var t = Dl(e);
    t !== null && t.tag === 5 && t.type === 'form' ? If(t) : Ta.r(e);
  }
  var mn = typeof document > 'u' ? null : document;
  function km(e, t, a) {
    var l = mn;
    if (l && typeof t == 'string' && t) {
      var i = kt(t);
      ((i = 'link[rel="' + e + '"][href="' + i + '"]'),
        typeof a == 'string' && (i += '[crossorigin="' + a + '"]'),
        Um.has(i) ||
          (Um.add(i),
          (e = { rel: e, crossOrigin: a, href: t }),
          l.querySelector(i) === null &&
            ((t = l.createElement('link')),
            mt(t, 'link', e),
            it(t),
            l.head.appendChild(t))));
    }
  }
  function nb(e) {
    (Ta.D(e), km('dns-prefetch', e, null));
  }
  function ib(e, t) {
    (Ta.C(e, t), km('preconnect', e, t));
  }
  function sb(e, t, a) {
    Ta.L(e, t, a);
    var l = mn;
    if (l && e && t) {
      var i = 'link[rel="preload"][as="' + kt(t) + '"]';
      t === 'image' && a && a.imageSrcSet
        ? ((i += '[imagesrcset="' + kt(a.imageSrcSet) + '"]'),
          typeof a.imageSizes == 'string' &&
            (i += '[imagesizes="' + kt(a.imageSizes) + '"]'))
        : (i += '[href="' + kt(e) + '"]');
      var s = i;
      switch (t) {
        case 'style':
          s = hn(e);
          break;
        case 'script':
          s = yn(e);
      }
      Zt.has(s) ||
        ((e = x(
          {
            rel: 'preload',
            href: t === 'image' && a && a.imageSrcSet ? void 0 : e,
            as: t,
          },
          a,
        )),
        Zt.set(s, e),
        l.querySelector(i) !== null ||
          (t === 'style' && l.querySelector(ri(s))) ||
          (t === 'script' && l.querySelector(ui(s))) ||
          ((t = l.createElement('link')),
          mt(t, 'link', e),
          it(t),
          l.head.appendChild(t)));
    }
  }
  function rb(e, t) {
    Ta.m(e, t);
    var a = mn;
    if (a && e) {
      var l = t && typeof t.as == 'string' ? t.as : 'script',
        i =
          'link[rel="modulepreload"][as="' + kt(l) + '"][href="' + kt(e) + '"]',
        s = i;
      switch (l) {
        case 'audioworklet':
        case 'paintworklet':
        case 'serviceworker':
        case 'sharedworker':
        case 'worker':
        case 'script':
          s = yn(e);
      }
      if (
        !Zt.has(s) &&
        ((e = x({ rel: 'modulepreload', href: e }, t)),
        Zt.set(s, e),
        a.querySelector(i) === null)
      ) {
        switch (l) {
          case 'audioworklet':
          case 'paintworklet':
          case 'serviceworker':
          case 'sharedworker':
          case 'worker':
          case 'script':
            if (a.querySelector(ui(s))) return;
        }
        ((l = a.createElement('link')),
          mt(l, 'link', e),
          it(l),
          a.head.appendChild(l));
      }
    }
  }
  function ub(e, t, a) {
    Ta.S(e, t, a);
    var l = mn;
    if (l && e) {
      var i = Ul(l).hoistableStyles,
        s = hn(e);
      t = t || 'default';
      var o = i.get(s);
      if (!o) {
        var y = { loading: 0, preload: null };
        if ((o = l.querySelector(ri(s)))) y.loading = 5;
        else {
          ((e = x({ rel: 'stylesheet', href: e, 'data-precedence': t }, a)),
            (a = Zt.get(s)) && fc(e, a));
          var E = (o = l.createElement('link'));
          (it(E),
            mt(E, 'link', e),
            (E._p = new Promise(function (_, k) {
              ((E.onload = _), (E.onerror = k));
            })),
            E.addEventListener('load', function () {
              y.loading |= 1;
            }),
            E.addEventListener('error', function () {
              y.loading |= 2;
            }),
            (y.loading |= 4),
            Ns(o, t, l));
        }
        ((o = { type: 'stylesheet', instance: o, count: 1, state: y }),
          i.set(s, o));
      }
    }
  }
  function cb(e, t) {
    Ta.X(e, t);
    var a = mn;
    if (a && e) {
      var l = Ul(a).hoistableScripts,
        i = yn(e),
        s = l.get(i);
      s ||
        ((s = a.querySelector(ui(i))),
        s ||
          ((e = x({ src: e, async: !0 }, t)),
          (t = Zt.get(i)) && dc(e, t),
          (s = a.createElement('script')),
          it(s),
          mt(s, 'link', e),
          a.head.appendChild(s)),
        (s = { type: 'script', instance: s, count: 1, state: null }),
        l.set(i, s));
    }
  }
  function ob(e, t) {
    Ta.M(e, t);
    var a = mn;
    if (a && e) {
      var l = Ul(a).hoistableScripts,
        i = yn(e),
        s = l.get(i);
      s ||
        ((s = a.querySelector(ui(i))),
        s ||
          ((e = x({ src: e, async: !0, type: 'module' }, t)),
          (t = Zt.get(i)) && dc(e, t),
          (s = a.createElement('script')),
          it(s),
          mt(s, 'link', e),
          a.head.appendChild(s)),
        (s = { type: 'script', instance: s, count: 1, state: null }),
        l.set(i, s));
    }
  }
  function Bm(e, t, a, l) {
    var i = (i = K.current) ? js(i) : null;
    if (!i) throw Error(c(446));
    switch (e) {
      case 'meta':
      case 'title':
        return null;
      case 'style':
        return typeof a.precedence == 'string' && typeof a.href == 'string'
          ? ((t = hn(a.href)),
            (a = Ul(i).hoistableStyles),
            (l = a.get(t)),
            l ||
              ((l = { type: 'style', instance: null, count: 0, state: null }),
              a.set(t, l)),
            l)
          : { type: 'void', instance: null, count: 0, state: null };
      case 'link':
        if (
          a.rel === 'stylesheet' &&
          typeof a.href == 'string' &&
          typeof a.precedence == 'string'
        ) {
          e = hn(a.href);
          var s = Ul(i).hoistableStyles,
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
                s || fb(i, e, a, o.state))),
            t && l === null)
          )
            throw Error(c(528, ''));
          return o;
        }
        if (t && l !== null) throw Error(c(529, ''));
        return null;
      case 'script':
        return (
          (t = a.async),
          (a = a.src),
          typeof a == 'string' &&
          t &&
          typeof t != 'function' &&
          typeof t != 'symbol'
            ? ((t = yn(a)),
              (a = Ul(i).hoistableScripts),
              (l = a.get(t)),
              l ||
                ((l = {
                  type: 'script',
                  instance: null,
                  count: 0,
                  state: null,
                }),
                a.set(t, l)),
              l)
            : { type: 'void', instance: null, count: 0, state: null }
        );
      default:
        throw Error(c(444, e));
    }
  }
  function hn(e) {
    return 'href="' + kt(e) + '"';
  }
  function ri(e) {
    return 'link[rel="stylesheet"][' + e + ']';
  }
  function Hm(e) {
    return x({}, e, { 'data-precedence': e.precedence, precedence: null });
  }
  function fb(e, t, a, l) {
    e.querySelector('link[rel="preload"][as="style"][' + t + ']')
      ? (l.loading = 1)
      : ((t = e.createElement('link')),
        (l.preload = t),
        t.addEventListener('load', function () {
          return (l.loading |= 1);
        }),
        t.addEventListener('error', function () {
          return (l.loading |= 2);
        }),
        mt(t, 'link', a),
        it(t),
        e.head.appendChild(t));
  }
  function yn(e) {
    return '[src="' + kt(e) + '"]';
  }
  function ui(e) {
    return 'script[async]' + e;
  }
  function qm(e, t, a) {
    if ((t.count++, t.instance === null))
      switch (t.type) {
        case 'style':
          var l = e.querySelector('style[data-href~="' + kt(a.href) + '"]');
          if (l) return ((t.instance = l), it(l), l);
          var i = x({}, a, {
            'data-href': a.href,
            'data-precedence': a.precedence,
            href: null,
            precedence: null,
          });
          return (
            (l = (e.ownerDocument || e).createElement('style')),
            it(l),
            mt(l, 'style', i),
            Ns(l, a.precedence, e),
            (t.instance = l)
          );
        case 'stylesheet':
          i = hn(a.href);
          var s = e.querySelector(ri(i));
          if (s) return ((t.state.loading |= 4), (t.instance = s), it(s), s);
          ((l = Hm(a)),
            (i = Zt.get(i)) && fc(l, i),
            (s = (e.ownerDocument || e).createElement('link')),
            it(s));
          var o = s;
          return (
            (o._p = new Promise(function (y, E) {
              ((o.onload = y), (o.onerror = E));
            })),
            mt(s, 'link', l),
            (t.state.loading |= 4),
            Ns(s, a.precedence, e),
            (t.instance = s)
          );
        case 'script':
          return (
            (s = yn(a.src)),
            (i = e.querySelector(ui(s)))
              ? ((t.instance = i), it(i), i)
              : ((l = a),
                (i = Zt.get(s)) && ((l = x({}, a)), dc(l, i)),
                (e = e.ownerDocument || e),
                (i = e.createElement('script')),
                it(i),
                mt(i, 'link', l),
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
        ((l = t.instance), (t.state.loading |= 4), Ns(l, a.precedence, e));
    return t.instance;
  }
  function Ns(e, t, a) {
    for (
      var l = a.querySelectorAll(
          'link[rel="stylesheet"][data-precedence],style[data-precedence]',
        ),
        i = l.length ? l[l.length - 1] : null,
        s = i,
        o = 0;
      o < l.length;
      o++
    ) {
      var y = l[o];
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
  function Lm(e, t, a) {
    if (Rs === null) {
      var l = new Map(),
        i = (Rs = new Map());
      i.set(a, l);
    } else ((i = Rs), (l = i.get(a)), l || ((l = new Map()), i.set(a, l)));
    if (l.has(e)) return l;
    for (
      l.set(e, null), a = a.getElementsByTagName(e), i = 0;
      i < a.length;
      i++
    ) {
      var s = a[i];
      if (
        !(
          s[An] ||
          s[ct] ||
          (e === 'link' && s.getAttribute('rel') === 'stylesheet')
        ) &&
        s.namespaceURI !== 'http://www.w3.org/2000/svg'
      ) {
        var o = s.getAttribute(t) || '';
        o = e + o;
        var y = l.get(o);
        y ? y.push(s) : l.set(o, [s]);
      }
    }
    return l;
  }
  function Ym(e, t, a) {
    ((e = e.ownerDocument || e),
      e.head.insertBefore(
        a,
        t === 'title' ? e.querySelector('head > title') : null,
      ));
  }
  function db(e, t, a) {
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
  function Gm(e) {
    return !(e.type === 'stylesheet' && (e.state.loading & 3) === 0);
  }
  function mb(e, t, a, l) {
    if (
      a.type === 'stylesheet' &&
      (typeof l.media != 'string' || matchMedia(l.media).matches !== !1) &&
      (a.state.loading & 4) === 0
    ) {
      if (a.instance === null) {
        var i = hn(l.href),
          s = t.querySelector(ri(i));
        if (s) {
          ((t = s._p),
            t !== null &&
              typeof t == 'object' &&
              typeof t.then == 'function' &&
              (e.count++, (e = zs.bind(e)), t.then(e, e)),
            (a.state.loading |= 4),
            (a.instance = s),
            it(s));
          return;
        }
        ((s = t.ownerDocument || t),
          (l = Hm(l)),
          (i = Zt.get(i)) && fc(l, i),
          (s = s.createElement('link')),
          it(s));
        var o = s;
        ((o._p = new Promise(function (y, E) {
          ((o.onload = y), (o.onerror = E));
        })),
          mt(s, 'link', l),
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
  var mc = 0;
  function hb(e, t) {
    return (
      e.stylesheets && e.count === 0 && Cs(e, e.stylesheets),
      0 < e.count || 0 < e.imgCount
        ? function (a) {
            var l = setTimeout(function () {
              if ((e.stylesheets && Cs(e, e.stylesheets), e.unsuspend)) {
                var s = e.unsuspend;
                ((e.unsuspend = null), s());
              }
            }, 6e4 + t);
            0 < e.imgBytes && mc === 0 && (mc = 62500 * Jg());
            var i = setTimeout(
              function () {
                if (
                  ((e.waitingForImages = !1),
                  e.count === 0 &&
                    (e.stylesheets && Cs(e, e.stylesheets), e.unsuspend))
                ) {
                  var s = e.unsuspend;
                  ((e.unsuspend = null), s());
                }
              },
              (e.imgBytes > mc ? 50 : 800) + t,
            );
            return (
              (e.unsuspend = a),
              function () {
                ((e.unsuspend = null), clearTimeout(l), clearTimeout(i));
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
      if (this.stylesheets) Cs(this, this.stylesheets);
      else if (this.unsuspend) {
        var e = this.unsuspend;
        ((this.unsuspend = null), e());
      }
    }
  }
  var _s = null;
  function Cs(e, t) {
    ((e.stylesheets = null),
      e.unsuspend !== null &&
        (e.count++,
        (_s = new Map()),
        t.forEach(yb, e),
        (_s = null),
        zs.call(e)));
  }
  function yb(e, t) {
    if (!(t.state.loading & 4)) {
      var a = _s.get(e);
      if (a) var l = a.get(null);
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
            (a.set(o.dataset.precedence, o), (l = o));
        }
        l && a.set(null, l);
      }
      ((i = t.instance),
        (o = i.getAttribute('data-precedence')),
        (s = a.get(o) || l),
        s === l && a.set(null, i),
        a.set(o, i),
        this.count++,
        (l = zs.bind(this)),
        i.addEventListener('load', l),
        i.addEventListener('error', l),
        s
          ? s.parentNode.insertBefore(i, s.nextSibling)
          : ((e = e.nodeType === 9 ? e.head : e),
            e.insertBefore(i, e.firstChild)),
        (t.state.loading |= 4));
    }
  }
  var ci = {
    $$typeof: ae,
    Provider: null,
    Consumer: null,
    _currentValue: se,
    _currentValue2: se,
    _threadCount: 0,
  };
  function pb(e, t, a, l, i, s, o, y, E) {
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
      (this.identifierPrefix = l),
      (this.onUncaughtError = i),
      (this.onCaughtError = s),
      (this.onRecoverableError = o),
      (this.pooledCache = null),
      (this.pooledCacheLanes = 0),
      (this.formState = E),
      (this.incompleteTransitions = new Map()));
  }
  function Xm(e, t, a, l, i, s, o, y, E, _, k, Y) {
    return (
      (e = new pb(e, t, a, o, E, _, k, Y, y)),
      (t = 1),
      s === !0 && (t |= 24),
      (s = Rt(3, null, null, t)),
      (e.current = s),
      (s.stateNode = e),
      (t = Qr()),
      t.refCount++,
      (e.pooledCache = t),
      t.refCount++,
      (s.memoizedState = { element: l, isDehydrated: a, cache: t }),
      Wr(s),
      e
    );
  }
  function Zm(e) {
    return e ? ((e = Vl), e) : Vl;
  }
  function Vm(e, t, a, l, i, s) {
    ((i = Zm(i)),
      l.context === null ? (l.context = i) : (l.pendingContext = i),
      (l = Ba(t)),
      (l.payload = { element: a }),
      (s = s === void 0 ? null : s),
      s !== null && (l.callback = s),
      (a = Ha(e, l, t)),
      a !== null && (Tt(a, e, t), Yn(a, e, t)));
  }
  function Qm(e, t) {
    if (((e = e.memoizedState), e !== null && e.dehydrated !== null)) {
      var a = e.retryLane;
      e.retryLane = a !== 0 && a < t ? a : t;
    }
  }
  function hc(e, t) {
    (Qm(e, t), (e = e.alternate) && Qm(e, t));
  }
  function Km(e) {
    if (e.tag === 13 || e.tag === 31) {
      var t = dl(e, 67108864);
      (t !== null && Tt(t, e, 67108864), hc(e, 67108864));
    }
  }
  function Jm(e) {
    if (e.tag === 13 || e.tag === 31) {
      var t = Mt();
      t = cr(t);
      var a = dl(e, t);
      (a !== null && Tt(a, e, t), hc(e, t));
    }
  }
  var Os = !0;
  function gb(e, t, a, l) {
    var i = R.T;
    R.T = null;
    var s = q.p;
    try {
      ((q.p = 2), yc(e, t, a, l));
    } finally {
      ((q.p = s), (R.T = i));
    }
  }
  function bb(e, t, a, l) {
    var i = R.T;
    R.T = null;
    var s = q.p;
    try {
      ((q.p = 8), yc(e, t, a, l));
    } finally {
      ((q.p = s), (R.T = i));
    }
  }
  function yc(e, t, a, l) {
    if (Os) {
      var i = pc(l);
      if (i === null) (tc(e, t, l, Ms, a), Wm(e, l));
      else if (xb(i, e, t, a, l)) l.stopPropagation();
      else if ((Wm(e, l), t & 4 && -1 < vb.indexOf(e))) {
        for (; i !== null; ) {
          var s = Dl(i);
          if (s !== null)
            switch (s.tag) {
              case 3:
                if (((s = s.stateNode), s.current.memoizedState.isDehydrated)) {
                  var o = rl(s.pendingLanes);
                  if (o !== 0) {
                    var y = s;
                    for (y.pendingLanes |= 2, y.entangledLanes |= 2; o; ) {
                      var E = 1 << (31 - jt(o));
                      ((y.entanglements[1] |= E), (o &= ~E));
                    }
                    (Pt(s), (Oe & 6) === 0 && ((ys = At() + 500), li(0)));
                  }
                }
                break;
              case 31:
              case 13:
                ((y = dl(s, 2)), y !== null && Tt(y, s, 2), gs(), hc(s, 2));
            }
          if (((s = pc(l)), s === null && tc(e, t, l, Ms, a), s === i)) break;
          i = s;
        }
        i !== null && l.stopPropagation();
      } else tc(e, t, l, null, a);
    }
  }
  function pc(e) {
    return ((e = br(e)), gc(e));
  }
  var Ms = null;
  function gc(e) {
    if (((Ms = null), (e = Ml(e)), e !== null)) {
      var t = d(e);
      if (t === null) e = null;
      else {
        var a = t.tag;
        if (a === 13) {
          if (((e = h(t)), e !== null)) return e;
          e = null;
        } else if (a === 31) {
          if (((e = v(t)), e !== null)) return e;
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
  function $m(e) {
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
        switch (np()) {
          case to:
            return 2;
          case ao:
            return 8;
          case Ei:
          case ip:
            return 32;
          case lo:
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
    vb =
      'mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset'.split(
        ' ',
      );
  function Wm(e, t) {
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
  function di(e, t, a, l, i, s) {
    return e === null || e.nativeEvent !== s
      ? ((e = {
          blockedOn: t,
          domEventName: a,
          eventSystemFlags: l,
          nativeEvent: s,
          targetContainers: [i],
        }),
        t !== null && ((t = Dl(t)), t !== null && Km(t)),
        e)
      : ((e.eventSystemFlags |= l),
        (t = e.targetContainers),
        i !== null && t.indexOf(i) === -1 && t.push(i),
        e);
  }
  function xb(e, t, a, l, i) {
    switch (t) {
      case 'focusin':
        return (($a = di($a, e, t, a, l, i)), !0);
      case 'dragenter':
        return ((Wa = di(Wa, e, t, a, l, i)), !0);
      case 'mouseover':
        return ((Fa = di(Fa, e, t, a, l, i)), !0);
      case 'pointerover':
        var s = i.pointerId;
        return (oi.set(s, di(oi.get(s) || null, e, t, a, l, i)), !0);
      case 'gotpointercapture':
        return (
          (s = i.pointerId),
          fi.set(s, di(fi.get(s) || null, e, t, a, l, i)),
          !0
        );
    }
    return !1;
  }
  function Fm(e) {
    var t = Ml(e.target);
    if (t !== null) {
      var a = d(t);
      if (a !== null) {
        if (((t = a.tag), t === 13)) {
          if (((t = h(a)), t !== null)) {
            ((e.blockedOn = t),
              co(e.priority, function () {
                Jm(a);
              }));
            return;
          }
        } else if (t === 31) {
          if (((t = v(a)), t !== null)) {
            ((e.blockedOn = t),
              co(e.priority, function () {
                Jm(a);
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
        var l = new a.constructor(a.type, a);
        ((gr = l), a.target.dispatchEvent(l), (gr = null));
      } else return ((t = Dl(a)), t !== null && Km(t), (e.blockedOn = a), !1);
      t.shift();
    }
    return !0;
  }
  function Im(e, t, a) {
    Ds(e) && a.delete(t);
  }
  function Sb() {
    ((bc = !1),
      $a !== null && Ds($a) && ($a = null),
      Wa !== null && Ds(Wa) && (Wa = null),
      Fa !== null && Ds(Fa) && (Fa = null),
      oi.forEach(Im),
      fi.forEach(Im));
  }
  function Us(e, t) {
    e.blockedOn === t &&
      ((e.blockedOn = null),
      bc ||
        ((bc = !0),
        n.unstable_scheduleCallback(n.unstable_NormalPriority, Sb)));
  }
  var ks = null;
  function Pm(e) {
    ks !== e &&
      ((ks = e),
      n.unstable_scheduleCallback(n.unstable_NormalPriority, function () {
        ks === e && (ks = null);
        for (var t = 0; t < e.length; t += 3) {
          var a = e[t],
            l = e[t + 1],
            i = e[t + 2];
          if (typeof l != 'function') {
            if (gc(l || a) === null) continue;
            break;
          }
          var s = Dl(a);
          s !== null &&
            (e.splice(t, 3),
            (t -= 3),
            pu(s, { pending: !0, data: i, method: a.method, action: l }, l, i));
        }
      }));
  }
  function pn(e) {
    function t(E) {
      return Us(E, e);
    }
    ($a !== null && Us($a, e),
      Wa !== null && Us(Wa, e),
      Fa !== null && Us(Fa, e),
      oi.forEach(t),
      fi.forEach(t));
    for (var a = 0; a < Ia.length; a++) {
      var l = Ia[a];
      l.blockedOn === e && (l.blockedOn = null);
    }
    for (; 0 < Ia.length && ((a = Ia[0]), a.blockedOn === null); )
      (Fm(a), a.blockedOn === null && Ia.shift());
    if (((a = (e.ownerDocument || e).$$reactFormReplay), a != null))
      for (l = 0; l < a.length; l += 3) {
        var i = a[l],
          s = a[l + 1],
          o = i[gt] || null;
        if (typeof s == 'function') o || Pm(a);
        else if (o) {
          var y = null;
          if (s && s.hasAttribute('formAction')) {
            if (((i = s), (o = s[gt] || null))) y = o.formAction;
            else if (gc(i) !== null) continue;
          } else y = o.action;
          (typeof y == 'function' ? (a[l + 1] = y) : (a.splice(l, 3), (l -= 3)),
            Pm(a));
        }
      }
  }
  function eh() {
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
      (i !== null && (i(), (i = null)), l || setTimeout(a, 20));
    }
    function a() {
      if (!l && !navigation.transition) {
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
      var l = !1,
        i = null;
      return (
        navigation.addEventListener('navigate', e),
        navigation.addEventListener('navigatesuccess', t),
        navigation.addEventListener('navigateerror', t),
        setTimeout(a, 100),
        function () {
          ((l = !0),
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
  ((Bs.prototype.render = vc.prototype.render =
    function (e) {
      var t = this._internalRoot;
      if (t === null) throw Error(c(409));
      var a = t.current,
        l = Mt();
      Vm(a, l, e, t, null, null);
    }),
    (Bs.prototype.unmount = vc.prototype.unmount =
      function () {
        var e = this._internalRoot;
        if (e !== null) {
          this._internalRoot = null;
          var t = e.containerInfo;
          (Vm(e.current, 2, null, e, null, null), gs(), (t[Ol] = null));
        }
      }));
  function Bs(e) {
    this._internalRoot = e;
  }
  Bs.prototype.unstable_scheduleHydration = function (e) {
    if (e) {
      var t = uo();
      e = { blockedOn: null, target: e, priority: t };
      for (var a = 0; a < Ia.length && t !== 0 && t < Ia[a].priority; a++);
      (Ia.splice(a, 0, e), a === 0 && Fm(e));
    }
  };
  var th = r.version;
  if (th !== '19.2.5') throw Error(c(527, th, '19.2.5'));
  q.findDOMNode = function (e) {
    var t = e._reactInternals;
    if (t === void 0)
      throw typeof e.render == 'function'
        ? Error(c(188))
        : ((e = Object.keys(e).join(',')), Error(c(268, e)));
    return (
      (e = b(t)),
      (e = e !== null ? S(e) : null),
      (e = e === null ? null : e.stateNode),
      e
    );
  };
  var Eb = {
    bundleType: 0,
    version: '19.2.5',
    rendererPackageName: 'react-dom',
    currentDispatcherRef: R,
    reconcilerVersion: '19.2.5',
  };
  if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ < 'u') {
    var Hs = __REACT_DEVTOOLS_GLOBAL_HOOK__;
    if (!Hs.isDisabled && Hs.supportsFiber)
      try {
        ((Sn = Hs.inject(Eb)), (wt = Hs));
      } catch {}
  }
  return (
    (hi.createRoot = function (e, t) {
      if (!f(e)) throw Error(c(299));
      var a = !1,
        l = '',
        i = ud,
        s = cd,
        o = od;
      return (
        t != null &&
          (t.unstable_strictMode === !0 && (a = !0),
          t.identifierPrefix !== void 0 && (l = t.identifierPrefix),
          t.onUncaughtError !== void 0 && (i = t.onUncaughtError),
          t.onCaughtError !== void 0 && (s = t.onCaughtError),
          t.onRecoverableError !== void 0 && (o = t.onRecoverableError)),
        (t = Xm(e, 1, !1, null, null, a, l, null, i, s, o, eh)),
        (e[Ol] = t.current),
        ec(e),
        new vc(t)
      );
    }),
    (hi.hydrateRoot = function (e, t, a) {
      if (!f(e)) throw Error(c(299));
      var l = !1,
        i = '',
        s = ud,
        o = cd,
        y = od,
        E = null;
      return (
        a != null &&
          (a.unstable_strictMode === !0 && (l = !0),
          a.identifierPrefix !== void 0 && (i = a.identifierPrefix),
          a.onUncaughtError !== void 0 && (s = a.onUncaughtError),
          a.onCaughtError !== void 0 && (o = a.onCaughtError),
          a.onRecoverableError !== void 0 && (y = a.onRecoverableError),
          a.formState !== void 0 && (E = a.formState)),
        (t = Xm(e, 1, !0, t, a ?? null, l, i, E, s, o, y, eh)),
        (t.context = Zm(null)),
        (a = t.current),
        (l = Mt()),
        (l = cr(l)),
        (i = Ba(l)),
        (i.callback = null),
        Ha(a, i, l),
        (a = l),
        (t.current.lanes = a),
        Tn(t, a),
        Pt(t),
        (e[Ol] = t.current),
        ec(e),
        new Bs(t)
      );
    }),
    (hi.version = '19.2.5'),
    hi
  );
}
var fh;
function Ub() {
  if (fh) return Ec.exports;
  fh = 1;
  function n() {
    if (
      !(
        typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > 'u' ||
        typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE != 'function'
      )
    )
      try {
        __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(n);
      } catch (r) {
        console.error(r);
      }
  }
  return (n(), (Ec.exports = Db()), Ec.exports);
}
var kb = Ub();
const Bb = Kh(kb);
/**
 * react-router v7.14.0
 *
 * Copyright (c) Remix Software Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.md file in the root directory of this source tree.
 *
 * @license MIT
 */ var dh = 'popstate';
function mh(n) {
  return (
    typeof n == 'object' &&
    n != null &&
    'pathname' in n &&
    'search' in n &&
    'hash' in n &&
    'state' in n &&
    'key' in n
  );
}
function Hb(n = {}) {
  function r(f, d) {
    let {
      pathname: h = '/',
      search: v = '',
      hash: p = '',
    } = zl(f.location.hash.substring(1));
    return (
      !h.startsWith('/') && !h.startsWith('.') && (h = '/' + h),
      Dc(
        '',
        { pathname: h, search: v, hash: p },
        (d.state && d.state.usr) || null,
        (d.state && d.state.key) || 'default',
      )
    );
  }
  function u(f, d) {
    let h = f.document.querySelector('base'),
      v = '';
    if (h && h.getAttribute('href')) {
      let p = f.location.href,
        b = p.indexOf('#');
      v = b === -1 ? p : p.slice(0, b);
    }
    return v + '#' + (typeof d == 'string' ? d : bi(d));
  }
  function c(f, d) {
    $t(
      f.pathname.charAt(0) === '/',
      `relative pathnames are not supported in hash history.push(${JSON.stringify(d)})`,
    );
  }
  return Lb(r, u, c, n);
}
function Qe(n, r) {
  if (n === !1 || n === null || typeof n > 'u') throw new Error(r);
}
function $t(n, r) {
  if (!n) {
    typeof console < 'u' && console.warn(r);
    try {
      throw new Error(r);
    } catch {}
  }
}
function qb() {
  return Math.random().toString(36).substring(2, 10);
}
function hh(n, r) {
  return {
    usr: n.state,
    key: n.key,
    idx: r,
    masked: n.unstable_mask
      ? { pathname: n.pathname, search: n.search, hash: n.hash }
      : void 0,
  };
}
function Dc(n, r, u = null, c, f) {
  return {
    pathname: typeof n == 'string' ? n : n.pathname,
    search: '',
    hash: '',
    ...(typeof r == 'string' ? zl(r) : r),
    state: u,
    key: (r && r.key) || c || qb(),
    unstable_mask: f,
  };
}
function bi({ pathname: n = '/', search: r = '', hash: u = '' }) {
  return (
    r && r !== '?' && (n += r.charAt(0) === '?' ? r : '?' + r),
    u && u !== '#' && (n += u.charAt(0) === '#' ? u : '#' + u),
    n
  );
}
function zl(n) {
  let r = {};
  if (n) {
    let u = n.indexOf('#');
    u >= 0 && ((r.hash = n.substring(u)), (n = n.substring(0, u)));
    let c = n.indexOf('?');
    (c >= 0 && ((r.search = n.substring(c)), (n = n.substring(0, c))),
      n && (r.pathname = n));
  }
  return r;
}
function Lb(n, r, u, c = {}) {
  let { window: f = document.defaultView, v5Compat: d = !1 } = c,
    h = f.history,
    v = 'POP',
    p = null,
    b = S();
  b == null && ((b = 0), h.replaceState({ ...h.state, idx: b }, ''));
  function S() {
    return (h.state || { idx: null }).idx;
  }
  function x() {
    v = 'POP';
    let U = S(),
      B = U == null ? null : U - b;
    ((b = U), p && p({ action: v, location: V.location, delta: B }));
  }
  function C(U, B) {
    v = 'PUSH';
    let ne = mh(U) ? U : Dc(V.location, U, B);
    (u && u(ne, U), (b = S() + 1));
    let ae = hh(ne, b),
      te = V.createHref(ne.unstable_mask || ne);
    try {
      h.pushState(ae, '', te);
    } catch (le) {
      if (le instanceof DOMException && le.name === 'DataCloneError') throw le;
      f.location.assign(te);
    }
    d && p && p({ action: v, location: V.location, delta: 1 });
  }
  function Z(U, B) {
    v = 'REPLACE';
    let ne = mh(U) ? U : Dc(V.location, U, B);
    (u && u(ne, U), (b = S()));
    let ae = hh(ne, b),
      te = V.createHref(ne.unstable_mask || ne);
    (h.replaceState(ae, '', te),
      d && p && p({ action: v, location: V.location, delta: 0 }));
  }
  function G(U) {
    return Yb(U);
  }
  let V = {
    get action() {
      return v;
    },
    get location() {
      return n(f, h);
    },
    listen(U) {
      if (p) throw new Error('A history only accepts one active listener');
      return (
        f.addEventListener(dh, x),
        (p = U),
        () => {
          (f.removeEventListener(dh, x), (p = null));
        }
      );
    },
    createHref(U) {
      return r(f, U);
    },
    createURL: G,
    encodeLocation(U) {
      let B = G(U);
      return { pathname: B.pathname, search: B.search, hash: B.hash };
    },
    push: C,
    replace: Z,
    go(U) {
      return h.go(U);
    },
  };
  return V;
}
function Yb(n, r = !1) {
  let u = 'http://localhost';
  (typeof window < 'u' &&
    (u =
      window.location.origin !== 'null'
        ? window.location.origin
        : window.location.href),
    Qe(u, 'No window.location.(origin|href) available to create URL'));
  let c = typeof n == 'string' ? n : bi(n);
  return (
    (c = c.replace(/ $/, '%20')),
    !r && c.startsWith('//') && (c = u + c),
    new URL(c, u)
  );
}
function Wh(n, r, u = '/') {
  return Gb(n, r, u, !1);
}
function Gb(n, r, u, c) {
  let f = typeof r == 'string' ? zl(r) : r,
    d = Na(f.pathname || '/', u);
  if (d == null) return null;
  let h = Fh(n);
  Xb(h);
  let v = null;
  for (let p = 0; v == null && p < h.length; ++p) {
    let b = e0(d);
    v = Ib(h[p], b, c);
  }
  return v;
}
function Fh(n, r = [], u = [], c = '', f = !1) {
  let d = (h, v, p = f, b) => {
    let S = {
      relativePath: b === void 0 ? h.path || '' : b,
      caseSensitive: h.caseSensitive === !0,
      childrenIndex: v,
      route: h,
    };
    if (S.relativePath.startsWith('/')) {
      if (!S.relativePath.startsWith(c) && p) return;
      (Qe(
        S.relativePath.startsWith(c),
        `Absolute route path "${S.relativePath}" nested under path "${c}" is not valid. An absolute child route path must start with the combined path of all its parent routes.`,
      ),
        (S.relativePath = S.relativePath.slice(c.length)));
    }
    let x = aa([c, S.relativePath]),
      C = u.concat(S);
    (h.children &&
      h.children.length > 0 &&
      (Qe(
        h.index !== !0,
        `Index routes must not have child routes. Please remove all child routes from route path "${x}".`,
      ),
      Fh(h.children, r, C, x, p)),
      !(h.path == null && !h.index) &&
        r.push({ path: x, score: Wb(x, h.index), routesMeta: C }));
  };
  return (
    n.forEach((h, v) => {
      var p;
      if (h.path === '' || !((p = h.path) != null && p.includes('?'))) d(h, v);
      else for (let b of Ih(h.path)) d(h, v, !0, b);
    }),
    r
  );
}
function Ih(n) {
  let r = n.split('/');
  if (r.length === 0) return [];
  let [u, ...c] = r,
    f = u.endsWith('?'),
    d = u.replace(/\?$/, '');
  if (c.length === 0) return f ? [d, ''] : [d];
  let h = Ih(c.join('/')),
    v = [];
  return (
    v.push(...h.map((p) => (p === '' ? d : [d, p].join('/')))),
    f && v.push(...h),
    v.map((p) => (n.startsWith('/') && p === '' ? '/' : p))
  );
}
function Xb(n) {
  n.sort((r, u) =>
    r.score !== u.score
      ? u.score - r.score
      : Fb(
          r.routesMeta.map((c) => c.childrenIndex),
          u.routesMeta.map((c) => c.childrenIndex),
        ),
  );
}
var Zb = /^:[\w-]+$/,
  Vb = 3,
  Qb = 2,
  Kb = 1,
  Jb = 10,
  $b = -2,
  yh = (n) => n === '*';
function Wb(n, r) {
  let u = n.split('/'),
    c = u.length;
  return (
    u.some(yh) && (c += $b),
    r && (c += Qb),
    u
      .filter((f) => !yh(f))
      .reduce((f, d) => f + (Zb.test(d) ? Vb : d === '' ? Kb : Jb), c)
  );
}
function Fb(n, r) {
  return n.length === r.length && n.slice(0, -1).every((c, f) => c === r[f])
    ? n[n.length - 1] - r[r.length - 1]
    : 0;
}
function Ib(n, r, u = !1) {
  let { routesMeta: c } = n,
    f = {},
    d = '/',
    h = [];
  for (let v = 0; v < c.length; ++v) {
    let p = c[v],
      b = v === c.length - 1,
      S = d === '/' ? r : r.slice(d.length) || '/',
      x = Js(
        { path: p.relativePath, caseSensitive: p.caseSensitive, end: b },
        S,
      ),
      C = p.route;
    if (
      (!x &&
        b &&
        u &&
        !c[c.length - 1].route.index &&
        (x = Js(
          { path: p.relativePath, caseSensitive: p.caseSensitive, end: !1 },
          S,
        )),
      !x)
    )
      return null;
    (Object.assign(f, x.params),
      h.push({
        params: f,
        pathname: aa([d, x.pathname]),
        pathnameBase: n0(aa([d, x.pathnameBase])),
        route: C,
      }),
      x.pathnameBase !== '/' && (d = aa([d, x.pathnameBase])));
  }
  return h;
}
function Js(n, r) {
  typeof n == 'string' && (n = { path: n, caseSensitive: !1, end: !0 });
  let [u, c] = Pb(n.path, n.caseSensitive, n.end),
    f = r.match(u);
  if (!f) return null;
  let d = f[0],
    h = d.replace(/(.)\/+$/, '$1'),
    v = f.slice(1);
  return {
    params: c.reduce((b, { paramName: S, isOptional: x }, C) => {
      if (S === '*') {
        let G = v[C] || '';
        h = d.slice(0, d.length - G.length).replace(/(.)\/+$/, '$1');
      }
      const Z = v[C];
      return (
        x && !Z ? (b[S] = void 0) : (b[S] = (Z || '').replace(/%2F/g, '/')),
        b
      );
    }, {}),
    pathname: d,
    pathnameBase: h,
    pattern: n,
  };
}
function Pb(n, r = !1, u = !0) {
  $t(
    n === '*' || !n.endsWith('*') || n.endsWith('/*'),
    `Route path "${n}" will be treated as if it were "${n.replace(/\*$/, '/*')}" because the \`*\` character must always follow a \`/\` in the pattern. To get rid of this warning, please change the route path to "${n.replace(/\*$/, '/*')}".`,
  );
  let c = [],
    f =
      '^' +
      n
        .replace(/\/*\*?$/, '')
        .replace(/^\/*/, '/')
        .replace(/[\\.*+^${}|()[\]]/g, '\\$&')
        .replace(/\/:([\w-]+)(\?)?/g, (h, v, p, b, S) => {
          if ((c.push({ paramName: v, isOptional: p != null }), p)) {
            let x = S.charAt(b + h.length);
            return x && x !== '/' ? '/([^\\/]*)' : '(?:/([^\\/]*))?';
          }
          return '/([^\\/]+)';
        })
        .replace(/\/([\w-]+)\?(\/|$)/g, '(/$1)?$2');
  return (
    n.endsWith('*')
      ? (c.push({ paramName: '*' }),
        (f += n === '*' || n === '/*' ? '(.*)$' : '(?:\\/(.+)|\\/*)$'))
      : u
        ? (f += '\\/*$')
        : n !== '' && n !== '/' && (f += '(?:(?=\\/|$))'),
    [new RegExp(f, r ? void 0 : 'i'), c]
  );
}
function e0(n) {
  try {
    return n
      .split('/')
      .map((r) => decodeURIComponent(r).replace(/\//g, '%2F'))
      .join('/');
  } catch (r) {
    return (
      $t(
        !1,
        `The URL path "${n}" could not be decoded because it is a malformed URL segment. This is probably due to a bad percent encoding (${r}).`,
      ),
      n
    );
  }
}
function Na(n, r) {
  if (r === '/') return n;
  if (!n.toLowerCase().startsWith(r.toLowerCase())) return null;
  let u = r.endsWith('/') ? r.length - 1 : r.length,
    c = n.charAt(u);
  return c && c !== '/' ? null : n.slice(u) || '/';
}
var t0 = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;
function a0(n, r = '/') {
  let {
      pathname: u,
      search: c = '',
      hash: f = '',
    } = typeof n == 'string' ? zl(n) : n,
    d;
  return (
    u
      ? ((u = u.replace(/\/\/+/g, '/')),
        u.startsWith('/') ? (d = ph(u.substring(1), '/')) : (d = ph(u, r)))
      : (d = r),
    { pathname: d, search: i0(c), hash: s0(f) }
  );
}
function ph(n, r) {
  let u = r.replace(/\/+$/, '').split('/');
  return (
    n.split('/').forEach((f) => {
      f === '..' ? u.length > 1 && u.pop() : f !== '.' && u.push(f);
    }),
    u.length > 1 ? u.join('/') : '/'
  );
}
function jc(n, r, u, c) {
  return `Cannot include a '${n}' character in a manually specified \`to.${r}\` field [${JSON.stringify(c)}].  Please separate it out to the \`to.${u}\` field. Alternatively you may provide the full path as a string in <Link to="..."> and the router will parse it for you.`;
}
function l0(n) {
  return n.filter(
    (r, u) => u === 0 || (r.route.path && r.route.path.length > 0),
  );
}
function Ph(n) {
  let r = l0(n);
  return r.map((u, c) => (c === r.length - 1 ? u.pathname : u.pathnameBase));
}
function Gc(n, r, u, c = !1) {
  let f;
  typeof n == 'string'
    ? (f = zl(n))
    : ((f = { ...n }),
      Qe(
        !f.pathname || !f.pathname.includes('?'),
        jc('?', 'pathname', 'search', f),
      ),
      Qe(
        !f.pathname || !f.pathname.includes('#'),
        jc('#', 'pathname', 'hash', f),
      ),
      Qe(!f.search || !f.search.includes('#'), jc('#', 'search', 'hash', f)));
  let d = n === '' || f.pathname === '',
    h = d ? '/' : f.pathname,
    v;
  if (h == null) v = u;
  else {
    let x = r.length - 1;
    if (!c && h.startsWith('..')) {
      let C = h.split('/');
      for (; C[0] === '..'; ) (C.shift(), (x -= 1));
      f.pathname = C.join('/');
    }
    v = x >= 0 ? r[x] : '/';
  }
  let p = a0(f, v),
    b = h && h !== '/' && h.endsWith('/'),
    S = (d || h === '.') && u.endsWith('/');
  return (!p.pathname.endsWith('/') && (b || S) && (p.pathname += '/'), p);
}
var aa = (n) => n.join('/').replace(/\/\/+/g, '/'),
  n0 = (n) => n.replace(/\/+$/, '').replace(/^\/*/, '/'),
  i0 = (n) => (!n || n === '?' ? '' : n.startsWith('?') ? n : '?' + n),
  s0 = (n) => (!n || n === '#' ? '' : n.startsWith('#') ? n : '#' + n),
  r0 = class {
    constructor(n, r, u, c = !1) {
      ((this.status = n),
        (this.statusText = r || ''),
        (this.internal = c),
        u instanceof Error
          ? ((this.data = u.toString()), (this.error = u))
          : (this.data = u));
    }
  };
function u0(n) {
  return (
    n != null &&
    typeof n.status == 'number' &&
    typeof n.statusText == 'string' &&
    typeof n.internal == 'boolean' &&
    'data' in n
  );
}
function c0(n) {
  return (
    n
      .map((r) => r.route.path)
      .filter(Boolean)
      .join('/')
      .replace(/\/\/*/g, '/') || '/'
  );
}
var ey =
  typeof window < 'u' &&
  typeof window.document < 'u' &&
  typeof window.document.createElement < 'u';
function ty(n, r) {
  let u = n;
  if (typeof u != 'string' || !t0.test(u))
    return { absoluteURL: void 0, isExternal: !1, to: u };
  let c = u,
    f = !1;
  if (ey)
    try {
      let d = new URL(window.location.href),
        h = u.startsWith('//') ? new URL(d.protocol + u) : new URL(u),
        v = Na(h.pathname, r);
      h.origin === d.origin && v != null
        ? (u = v + h.search + h.hash)
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
var ay = ['POST', 'PUT', 'PATCH', 'DELETE'];
new Set(ay);
var o0 = ['GET', ...ay];
new Set(o0);
var bn = A.createContext(null);
bn.displayName = 'DataRouter';
var lr = A.createContext(null);
lr.displayName = 'DataRouterState';
var ly = A.createContext(!1);
function f0() {
  return A.useContext(ly);
}
var ny = A.createContext({ isTransitioning: !1 });
ny.displayName = 'ViewTransition';
var d0 = A.createContext(new Map());
d0.displayName = 'Fetchers';
var m0 = A.createContext(null);
m0.displayName = 'Await';
var Vt = A.createContext(null);
Vt.displayName = 'Navigation';
var vi = A.createContext(null);
vi.displayName = 'Location';
var na = A.createContext({ outlet: null, matches: [], isDataRoute: !1 });
na.displayName = 'Route';
var Xc = A.createContext(null);
Xc.displayName = 'RouteError';
var iy = 'REACT_ROUTER_ERROR',
  h0 = 'REDIRECT',
  y0 = 'ROUTE_ERROR_RESPONSE';
function p0(n) {
  if (n.startsWith(`${iy}:${h0}:{`))
    try {
      let r = JSON.parse(n.slice(28));
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
function g0(n) {
  if (n.startsWith(`${iy}:${y0}:{`))
    try {
      let r = JSON.parse(n.slice(40));
      if (
        typeof r == 'object' &&
        r &&
        typeof r.status == 'number' &&
        typeof r.statusText == 'string'
      )
        return new r0(r.status, r.statusText, r.data);
    } catch {}
}
function b0(n, { relative: r } = {}) {
  Qe(
    xi(),
    'useHref() may be used only in the context of a <Router> component.',
  );
  let { basename: u, navigator: c } = A.useContext(Vt),
    { hash: f, pathname: d, search: h } = Si(n, { relative: r }),
    v = d;
  return (
    u !== '/' && (v = d === '/' ? u : aa([u, d])),
    c.createHref({ pathname: v, search: h, hash: f })
  );
}
function xi() {
  return A.useContext(vi) != null;
}
function Ra() {
  return (
    Qe(
      xi(),
      'useLocation() may be used only in the context of a <Router> component.',
    ),
    A.useContext(vi).location
  );
}
var sy =
  'You should call navigate() in a React.useEffect(), not when your component is first rendered.';
function ry(n) {
  A.useContext(Vt).static || A.useLayoutEffect(n);
}
function v0() {
  let { isDataRoute: n } = A.useContext(na);
  return n ? D0() : x0();
}
function x0() {
  Qe(
    xi(),
    'useNavigate() may be used only in the context of a <Router> component.',
  );
  let n = A.useContext(bn),
    { basename: r, navigator: u } = A.useContext(Vt),
    { matches: c } = A.useContext(na),
    { pathname: f } = Ra(),
    d = JSON.stringify(Ph(c)),
    h = A.useRef(!1);
  return (
    ry(() => {
      h.current = !0;
    }),
    A.useCallback(
      (p, b = {}) => {
        if (($t(h.current, sy), !h.current)) return;
        if (typeof p == 'number') {
          u.go(p);
          return;
        }
        let S = Gc(p, JSON.parse(d), f, b.relative === 'path');
        (n == null &&
          r !== '/' &&
          (S.pathname = S.pathname === '/' ? r : aa([r, S.pathname])),
          (b.replace ? u.replace : u.push)(S, b.state, b));
      },
      [r, u, d, f, n],
    )
  );
}
var S0 = A.createContext(null);
function E0(n) {
  let r = A.useContext(na).outlet;
  return A.useMemo(
    () => r && A.createElement(S0.Provider, { value: n }, r),
    [r, n],
  );
}
function Si(n, { relative: r } = {}) {
  let { matches: u } = A.useContext(na),
    { pathname: c } = Ra(),
    f = JSON.stringify(Ph(u));
  return A.useMemo(() => Gc(n, JSON.parse(f), c, r === 'path'), [n, f, c, r]);
}
function T0(n, r) {
  return uy(n, r);
}
function uy(n, r, u) {
  var U;
  Qe(
    xi(),
    'useRoutes() may be used only in the context of a <Router> component.',
  );
  let { navigator: c } = A.useContext(Vt),
    { matches: f } = A.useContext(na),
    d = f[f.length - 1],
    h = d ? d.params : {},
    v = d ? d.pathname : '/',
    p = d ? d.pathnameBase : '/',
    b = d && d.route;
  {
    let B = (b && b.path) || '';
    oy(
      v,
      !b || B.endsWith('*') || B.endsWith('*?'),
      `You rendered descendant <Routes> (or called \`useRoutes()\`) at "${v}" (under <Route path="${B}">) but the parent route path has no trailing "*". This means if you navigate deeper, the parent won't match anymore and therefore the child routes will never render.

Please change the parent <Route path="${B}"> to <Route path="${B === '/' ? '*' : `${B}/*`}">.`,
    );
  }
  let S = Ra(),
    x;
  if (r) {
    let B = typeof r == 'string' ? zl(r) : r;
    (Qe(
      p === '/' || ((U = B.pathname) == null ? void 0 : U.startsWith(p)),
      `When overriding the location using \`<Routes location>\` or \`useRoutes(routes, location)\`, the location pathname must begin with the portion of the URL pathname that was matched by all parent routes. The current pathname base is "${p}" but pathname "${B.pathname}" was given in the \`location\` prop.`,
    ),
      (x = B));
  } else x = S;
  let C = x.pathname || '/',
    Z = C;
  if (p !== '/') {
    let B = p.replace(/^\//, '').split('/');
    Z = '/' + C.replace(/^\//, '').split('/').slice(B.length).join('/');
  }
  let G = Wh(n, { pathname: Z });
  ($t(
    b || G != null,
    `No routes matched location "${x.pathname}${x.search}${x.hash}" `,
  ),
    $t(
      G == null ||
        G[G.length - 1].route.element !== void 0 ||
        G[G.length - 1].route.Component !== void 0 ||
        G[G.length - 1].route.lazy !== void 0,
      `Matched leaf route at location "${x.pathname}${x.search}${x.hash}" does not have an element or Component. This means it will render an <Outlet /> with a null value by default resulting in an "empty" page.`,
    ));
  let V = R0(
    G &&
      G.map((B) =>
        Object.assign({}, B, {
          params: Object.assign({}, h, B.params),
          pathname: aa([
            p,
            c.encodeLocation
              ? c.encodeLocation(
                  B.pathname
                    .replace(/%/g, '%25')
                    .replace(/\?/g, '%3F')
                    .replace(/#/g, '%23'),
                ).pathname
              : B.pathname,
          ]),
          pathnameBase:
            B.pathnameBase === '/'
              ? p
              : aa([
                  p,
                  c.encodeLocation
                    ? c.encodeLocation(
                        B.pathnameBase
                          .replace(/%/g, '%25')
                          .replace(/\?/g, '%3F')
                          .replace(/#/g, '%23'),
                      ).pathname
                    : B.pathnameBase,
                ]),
        }),
      ),
    f,
    u,
  );
  return r && V
    ? A.createElement(
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
              ...x,
            },
            navigationType: 'POP',
          },
        },
        V,
      )
    : V;
}
function A0() {
  let n = M0(),
    r = u0(n)
      ? `${n.status} ${n.statusText}`
      : n instanceof Error
        ? n.message
        : JSON.stringify(n),
    u = n instanceof Error ? n.stack : null,
    c = 'rgba(200,200,200, 0.5)',
    f = { padding: '0.5rem', backgroundColor: c },
    d = { padding: '2px 4px', backgroundColor: c },
    h = null;
  return (
    console.error('Error handled by React Router default ErrorBoundary:', n),
    (h = A.createElement(
      A.Fragment,
      null,
      A.createElement('p', null, '💿 Hey developer 👋'),
      A.createElement(
        'p',
        null,
        'You can provide a way better UX than this when your app throws errors by providing your own ',
        A.createElement('code', { style: d }, 'ErrorBoundary'),
        ' or',
        ' ',
        A.createElement('code', { style: d }, 'errorElement'),
        ' prop on your route.',
      ),
    )),
    A.createElement(
      A.Fragment,
      null,
      A.createElement('h2', null, 'Unexpected Application Error!'),
      A.createElement('h3', { style: { fontStyle: 'italic' } }, r),
      u ? A.createElement('pre', { style: f }, u) : null,
      h,
    )
  );
}
var w0 = A.createElement(A0, null),
  cy = class extends A.Component {
    constructor(n) {
      (super(n),
        (this.state = {
          location: n.location,
          revalidation: n.revalidation,
          error: n.error,
        }));
    }
    static getDerivedStateFromError(n) {
      return { error: n };
    }
    static getDerivedStateFromProps(n, r) {
      return r.location !== n.location ||
        (r.revalidation !== 'idle' && n.revalidation === 'idle')
        ? { error: n.error, location: n.location, revalidation: n.revalidation }
        : {
            error: n.error !== void 0 ? n.error : r.error,
            location: r.location,
            revalidation: n.revalidation || r.revalidation,
          };
    }
    componentDidCatch(n, r) {
      this.props.onError
        ? this.props.onError(n, r)
        : console.error(
            'React Router caught the following error during render',
            n,
          );
    }
    render() {
      let n = this.state.error;
      if (
        this.context &&
        typeof n == 'object' &&
        n &&
        'digest' in n &&
        typeof n.digest == 'string'
      ) {
        const u = g0(n.digest);
        u && (n = u);
      }
      let r =
        n !== void 0
          ? A.createElement(
              na.Provider,
              { value: this.props.routeContext },
              A.createElement(Xc.Provider, {
                value: n,
                children: this.props.component,
              }),
            )
          : this.props.children;
      return this.context ? A.createElement(j0, { error: n }, r) : r;
    }
  };
cy.contextType = ly;
var Nc = new WeakMap();
function j0({ children: n, error: r }) {
  let { basename: u } = A.useContext(Vt);
  if (
    typeof r == 'object' &&
    r &&
    'digest' in r &&
    typeof r.digest == 'string'
  ) {
    let c = p0(r.digest);
    if (c) {
      let f = Nc.get(r);
      if (f) throw f;
      let d = ty(c.location, u);
      if (ey && !Nc.get(r))
        if (d.isExternal || c.reloadDocument)
          window.location.href = d.absoluteURL || d.to;
        else {
          const h = Promise.resolve().then(() =>
            window.__reactRouterDataRouter.navigate(d.to, {
              replace: c.replace,
            }),
          );
          throw (Nc.set(r, h), h);
        }
      return A.createElement('meta', {
        httpEquiv: 'refresh',
        content: `0;url=${d.absoluteURL || d.to}`,
      });
    }
  }
  return n;
}
function N0({ routeContext: n, match: r, children: u }) {
  let c = A.useContext(bn);
  return (
    c &&
      c.static &&
      c.staticContext &&
      (r.route.errorElement || r.route.ErrorBoundary) &&
      (c.staticContext._deepestRenderedBoundaryId = r.route.id),
    A.createElement(na.Provider, { value: n }, u)
  );
}
function R0(n, r = [], u) {
  let c = u == null ? void 0 : u.state;
  if (n == null) {
    if (!c) return null;
    if (c.errors) n = c.matches;
    else if (r.length === 0 && !c.initialized && c.matches.length > 0)
      n = c.matches;
    else return null;
  }
  let f = n,
    d = c == null ? void 0 : c.errors;
  if (d != null) {
    let S = f.findIndex(
      (x) => x.route.id && (d == null ? void 0 : d[x.route.id]) !== void 0,
    );
    (Qe(
      S >= 0,
      `Could not find a matching route for errors on route IDs: ${Object.keys(d).join(',')}`,
    ),
      (f = f.slice(0, Math.min(f.length, S + 1))));
  }
  let h = !1,
    v = -1;
  if (u && c) {
    h = c.renderFallback;
    for (let S = 0; S < f.length; S++) {
      let x = f[S];
      if (
        ((x.route.HydrateFallback || x.route.hydrateFallbackElement) && (v = S),
        x.route.id)
      ) {
        let { loaderData: C, errors: Z } = c,
          G =
            x.route.loader &&
            !C.hasOwnProperty(x.route.id) &&
            (!Z || Z[x.route.id] === void 0);
        if (x.route.lazy || G) {
          (u.isStatic && (h = !0),
            v >= 0 ? (f = f.slice(0, v + 1)) : (f = [f[0]]));
          break;
        }
      }
    }
  }
  let p = u == null ? void 0 : u.onError,
    b =
      c && p
        ? (S, x) => {
            var C, Z;
            p(S, {
              location: c.location,
              params:
                ((Z = (C = c.matches) == null ? void 0 : C[0]) == null
                  ? void 0
                  : Z.params) ?? {},
              unstable_pattern: c0(c.matches),
              errorInfo: x,
            });
          }
        : void 0;
  return f.reduceRight((S, x, C) => {
    let Z,
      G = !1,
      V = null,
      U = null;
    c &&
      ((Z = d && x.route.id ? d[x.route.id] : void 0),
      (V = x.route.errorElement || w0),
      h &&
        (v < 0 && C === 0
          ? (oy(
              'route-fallback',
              !1,
              'No `HydrateFallback` element provided to render during initial hydration',
            ),
            (G = !0),
            (U = null))
          : v === C &&
            ((G = !0), (U = x.route.hydrateFallbackElement || null))));
    let B = r.concat(f.slice(0, C + 1)),
      ne = () => {
        let ae;
        return (
          Z
            ? (ae = V)
            : G
              ? (ae = U)
              : x.route.Component
                ? (ae = A.createElement(x.route.Component, null))
                : x.route.element
                  ? (ae = x.route.element)
                  : (ae = S),
          A.createElement(N0, {
            match: x,
            routeContext: { outlet: S, matches: B, isDataRoute: c != null },
            children: ae,
          })
        );
      };
    return c && (x.route.ErrorBoundary || x.route.errorElement || C === 0)
      ? A.createElement(cy, {
          location: c.location,
          revalidation: c.revalidation,
          component: V,
          error: Z,
          children: ne(),
          routeContext: { outlet: null, matches: B, isDataRoute: !0 },
          onError: b,
        })
      : ne();
  }, null);
}
function Zc(n) {
  return `${n} must be used within a data router.  See https://reactrouter.com/en/main/routers/picking-a-router.`;
}
function z0(n) {
  let r = A.useContext(bn);
  return (Qe(r, Zc(n)), r);
}
function _0(n) {
  let r = A.useContext(lr);
  return (Qe(r, Zc(n)), r);
}
function C0(n) {
  let r = A.useContext(na);
  return (Qe(r, Zc(n)), r);
}
function Vc(n) {
  let r = C0(n),
    u = r.matches[r.matches.length - 1];
  return (
    Qe(
      u.route.id,
      `${n} can only be used on routes that contain a unique "id"`,
    ),
    u.route.id
  );
}
function O0() {
  return Vc('useRouteId');
}
function M0() {
  var c;
  let n = A.useContext(Xc),
    r = _0('useRouteError'),
    u = Vc('useRouteError');
  return n !== void 0 ? n : (c = r.errors) == null ? void 0 : c[u];
}
function D0() {
  let { router: n } = z0('useNavigate'),
    r = Vc('useNavigate'),
    u = A.useRef(!1);
  return (
    ry(() => {
      u.current = !0;
    }),
    A.useCallback(
      async (f, d = {}) => {
        ($t(u.current, sy),
          u.current &&
            (typeof f == 'number'
              ? await n.navigate(f)
              : await n.navigate(f, { fromRouteId: r, ...d })));
      },
      [n, r],
    )
  );
}
var gh = {};
function oy(n, r, u) {
  !r && !gh[n] && ((gh[n] = !0), $t(!1, u));
}
A.memo(U0);
function U0({ routes: n, future: r, state: u, isStatic: c, onError: f }) {
  return uy(n, void 0, { state: u, isStatic: c, onError: f });
}
function k0(n) {
  return E0(n.context);
}
function ja(n) {
  Qe(
    !1,
    'A <Route> is only ever to be used as the child of <Routes> element, never rendered directly. Please wrap your <Route> in a <Routes>.',
  );
}
function B0({
  basename: n = '/',
  children: r = null,
  location: u,
  navigationType: c = 'POP',
  navigator: f,
  static: d = !1,
  unstable_useTransitions: h,
}) {
  Qe(
    !xi(),
    'You cannot render a <Router> inside another <Router>. You should never have more than one in your app.',
  );
  let v = n.replace(/^\/*/, '/'),
    p = A.useMemo(
      () => ({
        basename: v,
        navigator: f,
        static: d,
        unstable_useTransitions: h,
        future: {},
      }),
      [v, f, d, h],
    );
  typeof u == 'string' && (u = zl(u));
  let {
      pathname: b = '/',
      search: S = '',
      hash: x = '',
      state: C = null,
      key: Z = 'default',
      unstable_mask: G,
    } = u,
    V = A.useMemo(() => {
      let U = Na(b, v);
      return U == null
        ? null
        : {
            location: {
              pathname: U,
              search: S,
              hash: x,
              state: C,
              key: Z,
              unstable_mask: G,
            },
            navigationType: c,
          };
    }, [v, b, S, x, C, Z, c, G]);
  return (
    $t(
      V != null,
      `<Router basename="${v}"> is not able to match the URL "${b}${S}${x}" because it does not start with the basename, so the <Router> won't render anything.`,
    ),
    V == null
      ? null
      : A.createElement(
          Vt.Provider,
          { value: p },
          A.createElement(vi.Provider, { children: r, value: V }),
        )
  );
}
function H0({ children: n, location: r }) {
  return T0(Uc(n), r);
}
function Uc(n, r = []) {
  let u = [];
  return (
    A.Children.forEach(n, (c, f) => {
      if (!A.isValidElement(c)) return;
      let d = [...r, f];
      if (c.type === A.Fragment) {
        u.push.apply(u, Uc(c.props.children, d));
        return;
      }
      (Qe(
        c.type === ja,
        `[${typeof c.type == 'string' ? c.type : c.type.name}] is not a <Route> component. All component children of <Routes> must be a <Route> or <React.Fragment>`,
      ),
        Qe(
          !c.props.index || !c.props.children,
          'An index route cannot have child routes.',
        ));
      let h = {
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
      (c.props.children && (h.children = Uc(c.props.children, d)), u.push(h));
    }),
    u
  );
}
var Gs = 'get',
  Xs = 'application/x-www-form-urlencoded';
function nr(n) {
  return typeof HTMLElement < 'u' && n instanceof HTMLElement;
}
function q0(n) {
  return nr(n) && n.tagName.toLowerCase() === 'button';
}
function L0(n) {
  return nr(n) && n.tagName.toLowerCase() === 'form';
}
function Y0(n) {
  return nr(n) && n.tagName.toLowerCase() === 'input';
}
function G0(n) {
  return !!(n.metaKey || n.altKey || n.ctrlKey || n.shiftKey);
}
function X0(n, r) {
  return n.button === 0 && (!r || r === '_self') && !G0(n);
}
var qs = null;
function Z0() {
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
function Rc(n) {
  return n != null && !V0.has(n)
    ? ($t(
        !1,
        `"${n}" is not a valid \`encType\` for \`<Form>\`/\`<fetcher.Form>\` and will default to "${Xs}"`,
      ),
      null)
    : n;
}
function Q0(n, r) {
  let u, c, f, d, h;
  if (L0(n)) {
    let v = n.getAttribute('action');
    ((c = v ? Na(v, r) : null),
      (u = n.getAttribute('method') || Gs),
      (f = Rc(n.getAttribute('enctype')) || Xs),
      (d = new FormData(n)));
  } else if (q0(n) || (Y0(n) && (n.type === 'submit' || n.type === 'image'))) {
    let v = n.form;
    if (v == null)
      throw new Error(
        'Cannot submit a <button> or <input type="submit"> without a <form>',
      );
    let p = n.getAttribute('formaction') || v.getAttribute('action');
    if (
      ((c = p ? Na(p, r) : null),
      (u = n.getAttribute('formmethod') || v.getAttribute('method') || Gs),
      (f =
        Rc(n.getAttribute('formenctype')) ||
        Rc(v.getAttribute('enctype')) ||
        Xs),
      (d = new FormData(v, n)),
      !Z0())
    ) {
      let { name: b, type: S, value: x } = n;
      if (S === 'image') {
        let C = b ? `${b}.` : '';
        (d.append(`${C}x`, '0'), d.append(`${C}y`, '0'));
      } else b && d.append(b, x);
    }
  } else {
    if (nr(n))
      throw new Error(
        'Cannot submit element that is not <form>, <button>, or <input type="submit|image">',
      );
    ((u = Gs), (c = null), (f = Xs), (h = n));
  }
  return (
    d && f === 'text/plain' && ((h = d), (d = void 0)),
    { action: c, method: u.toLowerCase(), encType: f, formData: d, body: h }
  );
}
Object.getOwnPropertyNames(Object.prototype).sort().join('\0');
function Qc(n, r) {
  if (n === !1 || n === null || typeof n > 'u') throw new Error(r);
}
function fy(n, r, u, c) {
  let f =
    typeof n == 'string'
      ? new URL(
          n,
          typeof window > 'u'
            ? 'server://singlefetch/'
            : window.location.origin,
        )
      : n;
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
async function K0(n, r) {
  if (n.id in r) return r[n.id];
  try {
    let u = await import(n.module);
    return ((r[n.id] = u), u);
  } catch (u) {
    return (
      console.error(
        `Error loading route module \`${n.module}\`, reloading page...`,
      ),
      console.error(u),
      window.__reactRouterContext && window.__reactRouterContext.isSpaMode,
      window.location.reload(),
      new Promise(() => {})
    );
  }
}
function J0(n) {
  return n == null
    ? !1
    : n.href == null
      ? n.rel === 'preload' &&
        typeof n.imageSrcSet == 'string' &&
        typeof n.imageSizes == 'string'
      : typeof n.rel == 'string' && typeof n.href == 'string';
}
async function $0(n, r, u) {
  let c = await Promise.all(
    n.map(async (f) => {
      let d = r.routes[f.route.id];
      if (d) {
        let h = await K0(d, u);
        return h.links ? h.links() : [];
      }
      return [];
    }),
  );
  return P0(
    c
      .flat(1)
      .filter(J0)
      .filter((f) => f.rel === 'stylesheet' || f.rel === 'preload')
      .map((f) =>
        f.rel === 'stylesheet'
          ? { ...f, rel: 'prefetch', as: 'style' }
          : { ...f, rel: 'prefetch' },
      ),
  );
}
function bh(n, r, u, c, f, d) {
  let h = (p, b) => (u[b] ? p.route.id !== u[b].route.id : !0),
    v = (p, b) => {
      var S;
      return (
        u[b].pathname !== p.pathname ||
        (((S = u[b].route.path) == null ? void 0 : S.endsWith('*')) &&
          u[b].params['*'] !== p.params['*'])
      );
    };
  return d === 'assets'
    ? r.filter((p, b) => h(p, b) || v(p, b))
    : d === 'data'
      ? r.filter((p, b) => {
          var x;
          let S = c.routes[p.route.id];
          if (!S || !S.hasLoader) return !1;
          if (h(p, b) || v(p, b)) return !0;
          if (p.route.shouldRevalidate) {
            let C = p.route.shouldRevalidate({
              currentUrl: new URL(
                f.pathname + f.search + f.hash,
                window.origin,
              ),
              currentParams: ((x = u[0]) == null ? void 0 : x.params) || {},
              nextUrl: new URL(n, window.origin),
              nextParams: p.params,
              defaultShouldRevalidate: !0,
            });
            if (typeof C == 'boolean') return C;
          }
          return !0;
        })
      : [];
}
function W0(n, r, { includeHydrateFallback: u } = {}) {
  return F0(
    n
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
function F0(n) {
  return [...new Set(n)];
}
function I0(n) {
  let r = {},
    u = Object.keys(n).sort();
  for (let c of u) r[c] = n[c];
  return r;
}
function P0(n, r) {
  let u = new Set();
  return (
    new Set(r),
    n.reduce((c, f) => {
      let d = JSON.stringify(I0(f));
      return (u.has(d) || (u.add(d), c.push({ key: d, link: f })), c);
    }, [])
  );
}
function Kc() {
  let n = A.useContext(bn);
  return (
    Qc(
      n,
      'You must render this element inside a <DataRouterContext.Provider> element',
    ),
    n
  );
}
function ev() {
  let n = A.useContext(lr);
  return (
    Qc(
      n,
      'You must render this element inside a <DataRouterStateContext.Provider> element',
    ),
    n
  );
}
var Jc = A.createContext(void 0);
Jc.displayName = 'FrameworkContext';
function $c() {
  let n = A.useContext(Jc);
  return (
    Qc(n, 'You must render this element inside a <HydratedRouter> element'),
    n
  );
}
function tv(n, r) {
  let u = A.useContext(Jc),
    [c, f] = A.useState(!1),
    [d, h] = A.useState(!1),
    {
      onFocus: v,
      onBlur: p,
      onMouseEnter: b,
      onMouseLeave: S,
      onTouchStart: x,
    } = r,
    C = A.useRef(null);
  (A.useEffect(() => {
    if ((n === 'render' && h(!0), n === 'viewport')) {
      let V = (B) => {
          B.forEach((ne) => {
            h(ne.isIntersecting);
          });
        },
        U = new IntersectionObserver(V, { threshold: 0.5 });
      return (
        C.current && U.observe(C.current),
        () => {
          U.disconnect();
        }
      );
    }
  }, [n]),
    A.useEffect(() => {
      if (c) {
        let V = setTimeout(() => {
          h(!0);
        }, 100);
        return () => {
          clearTimeout(V);
        };
      }
    }, [c]));
  let Z = () => {
      f(!0);
    },
    G = () => {
      (f(!1), h(!1));
    };
  return u
    ? n !== 'intent'
      ? [d, C, {}]
      : [
          d,
          C,
          {
            onFocus: yi(v, Z),
            onBlur: yi(p, G),
            onMouseEnter: yi(b, Z),
            onMouseLeave: yi(S, G),
            onTouchStart: yi(x, Z),
          },
        ]
    : [!1, C, {}];
}
function yi(n, r) {
  return (u) => {
    (n && n(u), u.defaultPrevented || r(u));
  };
}
function av({ page: n, ...r }) {
  let u = f0(),
    { router: c } = Kc(),
    f = A.useMemo(() => Wh(c.routes, n, c.basename), [c.routes, n, c.basename]);
  return f
    ? u
      ? A.createElement(nv, { page: n, matches: f, ...r })
      : A.createElement(iv, { page: n, matches: f, ...r })
    : null;
}
function lv(n) {
  let { manifest: r, routeModules: u } = $c(),
    [c, f] = A.useState([]);
  return (
    A.useEffect(() => {
      let d = !1;
      return (
        $0(n, r, u).then((h) => {
          d || f(h);
        }),
        () => {
          d = !0;
        }
      );
    }, [n, r, u]),
    c
  );
}
function nv({ page: n, matches: r, ...u }) {
  let c = Ra(),
    { future: f } = $c(),
    { basename: d } = Kc(),
    h = A.useMemo(() => {
      if (n === c.pathname + c.search + c.hash) return [];
      let v = fy(n, d, f.unstable_trailingSlashAwareDataRequests, 'rsc'),
        p = !1,
        b = [];
      for (let S of r)
        typeof S.route.shouldRevalidate == 'function'
          ? (p = !0)
          : b.push(S.route.id);
      return (
        p && b.length > 0 && v.searchParams.set('_routes', b.join(',')),
        [v.pathname + v.search]
      );
    }, [d, f.unstable_trailingSlashAwareDataRequests, n, c, r]);
  return A.createElement(
    A.Fragment,
    null,
    h.map((v) =>
      A.createElement('link', {
        key: v,
        rel: 'prefetch',
        as: 'fetch',
        href: v,
        ...u,
      }),
    ),
  );
}
function iv({ page: n, matches: r, ...u }) {
  let c = Ra(),
    { future: f, manifest: d, routeModules: h } = $c(),
    { basename: v } = Kc(),
    { loaderData: p, matches: b } = ev(),
    S = A.useMemo(() => bh(n, r, b, d, c, 'data'), [n, r, b, d, c]),
    x = A.useMemo(() => bh(n, r, b, d, c, 'assets'), [n, r, b, d, c]),
    C = A.useMemo(() => {
      if (n === c.pathname + c.search + c.hash) return [];
      let V = new Set(),
        U = !1;
      if (
        (r.forEach((ne) => {
          var te;
          let ae = d.routes[ne.route.id];
          !ae ||
            !ae.hasLoader ||
            ((!S.some((le) => le.route.id === ne.route.id) &&
              ne.route.id in p &&
              (te = h[ne.route.id]) != null &&
              te.shouldRevalidate) ||
            ae.hasClientLoader
              ? (U = !0)
              : V.add(ne.route.id));
        }),
        V.size === 0)
      )
        return [];
      let B = fy(n, v, f.unstable_trailingSlashAwareDataRequests, 'data');
      return (
        U &&
          V.size > 0 &&
          B.searchParams.set(
            '_routes',
            r
              .filter((ne) => V.has(ne.route.id))
              .map((ne) => ne.route.id)
              .join(','),
          ),
        [B.pathname + B.search]
      );
    }, [v, f.unstable_trailingSlashAwareDataRequests, p, c, d, S, r, n, h]),
    Z = A.useMemo(() => W0(x, d), [x, d]),
    G = lv(x);
  return A.createElement(
    A.Fragment,
    null,
    C.map((V) =>
      A.createElement('link', {
        key: V,
        rel: 'prefetch',
        as: 'fetch',
        href: V,
        ...u,
      }),
    ),
    Z.map((V) =>
      A.createElement('link', { key: V, rel: 'modulepreload', href: V, ...u }),
    ),
    G.map(({ key: V, link: U }) =>
      A.createElement('link', {
        key: V,
        nonce: u.nonce,
        ...U,
        crossOrigin: U.crossOrigin ?? u.crossOrigin,
      }),
    ),
  );
}
function sv(...n) {
  return (r) => {
    n.forEach((u) => {
      typeof u == 'function' ? u(r) : u != null && (u.current = r);
    });
  };
}
var rv =
  typeof window < 'u' &&
  typeof window.document < 'u' &&
  typeof window.document.createElement < 'u';
try {
  rv && (window.__reactRouterVersion = '7.14.0');
} catch {}
function uv({
  basename: n,
  children: r,
  unstable_useTransitions: u,
  window: c,
}) {
  let f = A.useRef();
  f.current == null && (f.current = Hb({ window: c, v5Compat: !0 }));
  let d = f.current,
    [h, v] = A.useState({ action: d.action, location: d.location }),
    p = A.useCallback(
      (b) => {
        u === !1 ? v(b) : A.startTransition(() => v(b));
      },
      [u],
    );
  return (
    A.useLayoutEffect(() => d.listen(p), [d, p]),
    A.createElement(B0, {
      basename: n,
      children: r,
      location: h.location,
      navigationType: h.action,
      navigator: d,
      unstable_useTransitions: u,
    })
  );
}
var dy = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i,
  $s = A.forwardRef(function (
    {
      onClick: r,
      discover: u = 'render',
      prefetch: c = 'none',
      relative: f,
      reloadDocument: d,
      replace: h,
      unstable_mask: v,
      state: p,
      target: b,
      to: S,
      preventScrollReset: x,
      viewTransition: C,
      unstable_defaultShouldRevalidate: Z,
      ...G
    },
    V,
  ) {
    let {
        basename: U,
        navigator: B,
        unstable_useTransitions: ne,
      } = A.useContext(Vt),
      ae = typeof S == 'string' && dy.test(S),
      te = ty(S, U);
    S = te.to;
    let le = b0(S, { relative: f }),
      W = Ra(),
      $ = null;
    if (v) {
      let P = Gc(v, [], W.unstable_mask ? W.unstable_mask.pathname : '/', !0);
      (U !== '/' && (P.pathname = P.pathname === '/' ? U : aa([U, P.pathname])),
        ($ = B.createHref(P)));
    }
    let [X, ye, Ye] = tv(c, G),
      Re = fv(S, {
        replace: h,
        unstable_mask: v,
        state: p,
        target: b,
        preventScrollReset: x,
        relative: f,
        viewTransition: C,
        unstable_defaultShouldRevalidate: Z,
        unstable_useTransitions: ne,
      });
    function be(P) {
      (r && r(P), P.defaultPrevented || Re(P));
    }
    let Ue = !(te.isExternal || d),
      ze = A.createElement('a', {
        ...G,
        ...Ye,
        href: (Ue ? $ : void 0) || te.absoluteURL || le,
        onClick: Ue ? be : r,
        ref: sv(V, ye),
        target: b,
        'data-discover': !ae && u === 'render' ? 'true' : void 0,
      });
    return X && !ae
      ? A.createElement(A.Fragment, null, ze, A.createElement(av, { page: le }))
      : ze;
  });
$s.displayName = 'Link';
var my = A.forwardRef(function (
  {
    'aria-current': r = 'page',
    caseSensitive: u = !1,
    className: c = '',
    end: f = !1,
    style: d,
    to: h,
    viewTransition: v,
    children: p,
    ...b
  },
  S,
) {
  let x = Si(h, { relative: b.relative }),
    C = Ra(),
    Z = A.useContext(lr),
    { navigator: G, basename: V } = A.useContext(Vt),
    U = Z != null && pv(x) && v === !0,
    B = G.encodeLocation ? G.encodeLocation(x).pathname : x.pathname,
    ne = C.pathname,
    ae =
      Z && Z.navigation && Z.navigation.location
        ? Z.navigation.location.pathname
        : null;
  (u ||
    ((ne = ne.toLowerCase()),
    (ae = ae ? ae.toLowerCase() : null),
    (B = B.toLowerCase())),
    ae && V && (ae = Na(ae, V) || ae));
  const te = B !== '/' && B.endsWith('/') ? B.length - 1 : B.length;
  let le = ne === B || (!f && ne.startsWith(B) && ne.charAt(te) === '/'),
    W =
      ae != null &&
      (ae === B || (!f && ae.startsWith(B) && ae.charAt(B.length) === '/')),
    $ = { isActive: le, isPending: W, isTransitioning: U },
    X = le ? r : void 0,
    ye;
  typeof c == 'function'
    ? (ye = c($))
    : (ye = [
        c,
        le ? 'active' : null,
        W ? 'pending' : null,
        U ? 'transitioning' : null,
      ]
        .filter(Boolean)
        .join(' '));
  let Ye = typeof d == 'function' ? d($) : d;
  return A.createElement(
    $s,
    {
      ...b,
      'aria-current': X,
      className: ye,
      ref: S,
      style: Ye,
      to: h,
      viewTransition: v,
    },
    typeof p == 'function' ? p($) : p,
  );
});
my.displayName = 'NavLink';
var cv = A.forwardRef(
  (
    {
      discover: n = 'render',
      fetcherKey: r,
      navigate: u,
      reloadDocument: c,
      replace: f,
      state: d,
      method: h = Gs,
      action: v,
      onSubmit: p,
      relative: b,
      preventScrollReset: S,
      viewTransition: x,
      unstable_defaultShouldRevalidate: C,
      ...Z
    },
    G,
  ) => {
    let { unstable_useTransitions: V } = A.useContext(Vt),
      U = hv(),
      B = yv(v, { relative: b }),
      ne = h.toLowerCase() === 'get' ? 'get' : 'post',
      ae = typeof v == 'string' && dy.test(v),
      te = (le) => {
        if ((p && p(le), le.defaultPrevented)) return;
        le.preventDefault();
        let W = le.nativeEvent.submitter,
          $ = (W == null ? void 0 : W.getAttribute('formmethod')) || h,
          X = () =>
            U(W || le.currentTarget, {
              fetcherKey: r,
              method: $,
              navigate: u,
              replace: f,
              state: d,
              relative: b,
              preventScrollReset: S,
              viewTransition: x,
              unstable_defaultShouldRevalidate: C,
            });
        V && u !== !1 ? A.startTransition(() => X()) : X();
      };
    return A.createElement('form', {
      ref: G,
      method: ne,
      action: B,
      onSubmit: c ? p : te,
      ...Z,
      'data-discover': !ae && n === 'render' ? 'true' : void 0,
    });
  },
);
cv.displayName = 'Form';
function ov(n) {
  return `${n} must be used within a data router.  See https://reactrouter.com/en/main/routers/picking-a-router.`;
}
function hy(n) {
  let r = A.useContext(bn);
  return (Qe(r, ov(n)), r);
}
function fv(
  n,
  {
    target: r,
    replace: u,
    unstable_mask: c,
    state: f,
    preventScrollReset: d,
    relative: h,
    viewTransition: v,
    unstable_defaultShouldRevalidate: p,
    unstable_useTransitions: b,
  } = {},
) {
  let S = v0(),
    x = Ra(),
    C = Si(n, { relative: h });
  return A.useCallback(
    (Z) => {
      if (X0(Z, r)) {
        Z.preventDefault();
        let G = u !== void 0 ? u : bi(x) === bi(C),
          V = () =>
            S(n, {
              replace: G,
              unstable_mask: c,
              state: f,
              preventScrollReset: d,
              relative: h,
              viewTransition: v,
              unstable_defaultShouldRevalidate: p,
            });
        b ? A.startTransition(() => V()) : V();
      }
    },
    [x, S, C, u, c, f, r, n, d, h, v, p, b],
  );
}
var dv = 0,
  mv = () => `__${String(++dv)}__`;
function hv() {
  let { router: n } = hy('useSubmit'),
    { basename: r } = A.useContext(Vt),
    u = O0(),
    c = n.fetch,
    f = n.navigate;
  return A.useCallback(
    async (d, h = {}) => {
      let { action: v, method: p, encType: b, formData: S, body: x } = Q0(d, r);
      if (h.navigate === !1) {
        let C = h.fetcherKey || mv();
        await c(C, u, h.action || v, {
          unstable_defaultShouldRevalidate: h.unstable_defaultShouldRevalidate,
          preventScrollReset: h.preventScrollReset,
          formData: S,
          body: x,
          formMethod: h.method || p,
          formEncType: h.encType || b,
          flushSync: h.flushSync,
        });
      } else
        await f(h.action || v, {
          unstable_defaultShouldRevalidate: h.unstable_defaultShouldRevalidate,
          preventScrollReset: h.preventScrollReset,
          formData: S,
          body: x,
          formMethod: h.method || p,
          formEncType: h.encType || b,
          replace: h.replace,
          state: h.state,
          fromRouteId: u,
          flushSync: h.flushSync,
          viewTransition: h.viewTransition,
        });
    },
    [c, f, r, u],
  );
}
function yv(n, { relative: r } = {}) {
  let { basename: u } = A.useContext(Vt),
    c = A.useContext(na);
  Qe(c, 'useFormAction must be used inside a RouteContext');
  let [f] = c.matches.slice(-1),
    d = { ...Si(n || '.', { relative: r }) },
    h = Ra();
  if (n == null) {
    d.search = h.search;
    let v = new URLSearchParams(d.search),
      p = v.getAll('index');
    if (p.some((S) => S === '')) {
      (v.delete('index'),
        p.filter((x) => x).forEach((x) => v.append('index', x)));
      let S = v.toString();
      d.search = S ? `?${S}` : '';
    }
  }
  return (
    (!n || n === '.') &&
      f.route.index &&
      (d.search = d.search ? d.search.replace(/^\?/, '?index&') : '?index'),
    u !== '/' && (d.pathname = d.pathname === '/' ? u : aa([u, d.pathname])),
    bi(d)
  );
}
function pv(n, { relative: r } = {}) {
  let u = A.useContext(ny);
  Qe(
    u != null,
    "`useViewTransitionState` must be used within `react-router-dom`'s `RouterProvider`.  Did you accidentally import `RouterProvider` from `react-router`?",
  );
  let { basename: c } = hy('useViewTransitionState'),
    f = Si(n, { relative: r });
  if (!u.isTransitioning) return !1;
  let d = Na(u.currentLocation.pathname, c) || u.currentLocation.pathname,
    h = Na(u.nextLocation.pathname, c) || u.nextLocation.pathname;
  return Js(f.pathname, h) != null || Js(f.pathname, d) != null;
}
$h();
function yy(n) {
  var r,
    u,
    c = '';
  if (typeof n == 'string' || typeof n == 'number') c += n;
  else if (typeof n == 'object')
    if (Array.isArray(n)) {
      var f = n.length;
      for (r = 0; r < f; r++)
        n[r] && (u = yy(n[r])) && (c && (c += ' '), (c += u));
    } else for (u in n) n[u] && (c && (c += ' '), (c += u));
  return c;
}
function gv() {
  for (var n, r, u = 0, c = '', f = arguments.length; u < f; u++)
    (n = arguments[u]) && (r = yy(n)) && (c && (c += ' '), (c += r));
  return c;
}
const bv = (n, r) => {
    const u = new Array(n.length + r.length);
    for (let c = 0; c < n.length; c++) u[c] = n[c];
    for (let c = 0; c < r.length; c++) u[n.length + c] = r[c];
    return u;
  },
  vv = (n, r) => ({ classGroupId: n, validator: r }),
  py = (n = new Map(), r = null, u) => ({
    nextPart: n,
    validators: r,
    classGroupId: u,
  }),
  Ws = '-',
  vh = [],
  xv = 'arbitrary..',
  Sv = (n) => {
    const r = Tv(n),
      { conflictingClassGroups: u, conflictingClassGroupModifiers: c } = n;
    return {
      getClassGroupId: (h) => {
        if (h.startsWith('[') && h.endsWith(']')) return Ev(h);
        const v = h.split(Ws),
          p = v[0] === '' && v.length > 1 ? 1 : 0;
        return gy(v, p, r);
      },
      getConflictingClassGroupIds: (h, v) => {
        if (v) {
          const p = c[h],
            b = u[h];
          return p ? (b ? bv(b, p) : p) : b || vh;
        }
        return u[h] || vh;
      },
    };
  },
  gy = (n, r, u) => {
    if (n.length - r === 0) return u.classGroupId;
    const f = n[r],
      d = u.nextPart.get(f);
    if (d) {
      const b = gy(n, r + 1, d);
      if (b) return b;
    }
    const h = u.validators;
    if (h === null) return;
    const v = r === 0 ? n.join(Ws) : n.slice(r).join(Ws),
      p = h.length;
    for (let b = 0; b < p; b++) {
      const S = h[b];
      if (S.validator(v)) return S.classGroupId;
    }
  },
  Ev = (n) =>
    n.slice(1, -1).indexOf(':') === -1
      ? void 0
      : (() => {
          const r = n.slice(1, -1),
            u = r.indexOf(':'),
            c = r.slice(0, u);
          return c ? xv + c : void 0;
        })(),
  Tv = (n) => {
    const { theme: r, classGroups: u } = n;
    return Av(u, r);
  },
  Av = (n, r) => {
    const u = py();
    for (const c in n) {
      const f = n[c];
      Wc(f, u, c, r);
    }
    return u;
  },
  Wc = (n, r, u, c) => {
    const f = n.length;
    for (let d = 0; d < f; d++) {
      const h = n[d];
      wv(h, r, u, c);
    }
  },
  wv = (n, r, u, c) => {
    if (typeof n == 'string') {
      jv(n, r, u);
      return;
    }
    if (typeof n == 'function') {
      Nv(n, r, u, c);
      return;
    }
    Rv(n, r, u, c);
  },
  jv = (n, r, u) => {
    const c = n === '' ? r : by(r, n);
    c.classGroupId = u;
  },
  Nv = (n, r, u, c) => {
    if (zv(n)) {
      Wc(n(c), r, u, c);
      return;
    }
    (r.validators === null && (r.validators = []), r.validators.push(vv(u, n)));
  },
  Rv = (n, r, u, c) => {
    const f = Object.entries(n),
      d = f.length;
    for (let h = 0; h < d; h++) {
      const [v, p] = f[h];
      Wc(p, by(r, v), u, c);
    }
  },
  by = (n, r) => {
    let u = n;
    const c = r.split(Ws),
      f = c.length;
    for (let d = 0; d < f; d++) {
      const h = c[d];
      let v = u.nextPart.get(h);
      (v || ((v = py()), u.nextPart.set(h, v)), (u = v));
    }
    return u;
  },
  zv = (n) => 'isThemeGetter' in n && n.isThemeGetter === !0,
  _v = (n) => {
    if (n < 1) return { get: () => {}, set: () => {} };
    let r = 0,
      u = Object.create(null),
      c = Object.create(null);
    const f = (d, h) => {
      ((u[d] = h), r++, r > n && ((r = 0), (c = u), (u = Object.create(null))));
    };
    return {
      get(d) {
        let h = u[d];
        if (h !== void 0) return h;
        if ((h = c[d]) !== void 0) return (f(d, h), h);
      },
      set(d, h) {
        d in u ? (u[d] = h) : f(d, h);
      },
    };
  },
  kc = '!',
  xh = ':',
  Cv = [],
  Sh = (n, r, u, c, f) => ({
    modifiers: n,
    hasImportantModifier: r,
    baseClassName: u,
    maybePostfixModifierPosition: c,
    isExternal: f,
  }),
  Ov = (n) => {
    const { prefix: r, experimentalParseClassName: u } = n;
    let c = (f) => {
      const d = [];
      let h = 0,
        v = 0,
        p = 0,
        b;
      const S = f.length;
      for (let V = 0; V < S; V++) {
        const U = f[V];
        if (h === 0 && v === 0) {
          if (U === xh) {
            (d.push(f.slice(p, V)), (p = V + 1));
            continue;
          }
          if (U === '/') {
            b = V;
            continue;
          }
        }
        U === '[' ? h++ : U === ']' ? h-- : U === '(' ? v++ : U === ')' && v--;
      }
      const x = d.length === 0 ? f : f.slice(p);
      let C = x,
        Z = !1;
      x.endsWith(kc)
        ? ((C = x.slice(0, -1)), (Z = !0))
        : x.startsWith(kc) && ((C = x.slice(1)), (Z = !0));
      const G = b && b > p ? b - p : void 0;
      return Sh(d, Z, C, G);
    };
    if (r) {
      const f = r + xh,
        d = c;
      c = (h) =>
        h.startsWith(f) ? d(h.slice(f.length)) : Sh(Cv, !1, h, void 0, !0);
    }
    if (u) {
      const f = c;
      c = (d) => u({ className: d, parseClassName: f });
    }
    return c;
  },
  Mv = (n) => {
    const r = new Map();
    return (
      n.orderSensitiveModifiers.forEach((u, c) => {
        r.set(u, 1e6 + c);
      }),
      (u) => {
        const c = [];
        let f = [];
        for (let d = 0; d < u.length; d++) {
          const h = u[d],
            v = h[0] === '[',
            p = r.has(h);
          v || p
            ? (f.length > 0 && (f.sort(), c.push(...f), (f = [])), c.push(h))
            : f.push(h);
        }
        return (f.length > 0 && (f.sort(), c.push(...f)), c);
      }
    );
  },
  Dv = (n) => ({
    cache: _v(n.cacheSize),
    parseClassName: Ov(n),
    sortModifiers: Mv(n),
    ...Sv(n),
  }),
  Uv = /\s+/,
  kv = (n, r) => {
    const {
        parseClassName: u,
        getClassGroupId: c,
        getConflictingClassGroupIds: f,
        sortModifiers: d,
      } = r,
      h = [],
      v = n.trim().split(Uv);
    let p = '';
    for (let b = v.length - 1; b >= 0; b -= 1) {
      const S = v[b],
        {
          isExternal: x,
          modifiers: C,
          hasImportantModifier: Z,
          baseClassName: G,
          maybePostfixModifierPosition: V,
        } = u(S);
      if (x) {
        p = S + (p.length > 0 ? ' ' + p : p);
        continue;
      }
      let U = !!V,
        B = c(U ? G.substring(0, V) : G);
      if (!B) {
        if (!U) {
          p = S + (p.length > 0 ? ' ' + p : p);
          continue;
        }
        if (((B = c(G)), !B)) {
          p = S + (p.length > 0 ? ' ' + p : p);
          continue;
        }
        U = !1;
      }
      const ne = C.length === 0 ? '' : C.length === 1 ? C[0] : d(C).join(':'),
        ae = Z ? ne + kc : ne,
        te = ae + B;
      if (h.indexOf(te) > -1) continue;
      h.push(te);
      const le = f(B, U);
      for (let W = 0; W < le.length; ++W) {
        const $ = le[W];
        h.push(ae + $);
      }
      p = S + (p.length > 0 ? ' ' + p : p);
    }
    return p;
  },
  Bv = (...n) => {
    let r = 0,
      u,
      c,
      f = '';
    for (; r < n.length; )
      (u = n[r++]) && (c = vy(u)) && (f && (f += ' '), (f += c));
    return f;
  },
  vy = (n) => {
    if (typeof n == 'string') return n;
    let r,
      u = '';
    for (let c = 0; c < n.length; c++)
      n[c] && (r = vy(n[c])) && (u && (u += ' '), (u += r));
    return u;
  },
  Hv = (n, ...r) => {
    let u, c, f, d;
    const h = (p) => {
        const b = r.reduce((S, x) => x(S), n());
        return (
          (u = Dv(b)),
          (c = u.cache.get),
          (f = u.cache.set),
          (d = v),
          v(p)
        );
      },
      v = (p) => {
        const b = c(p);
        if (b) return b;
        const S = kv(p, u);
        return (f(p, S), S);
      };
    return ((d = h), (...p) => d(Bv(...p)));
  },
  qv = [],
  nt = (n) => {
    const r = (u) => u[n] || qv;
    return ((r.isThemeGetter = !0), r);
  },
  xy = /^\[(?:(\w[\w-]*):)?(.+)\]$/i,
  Sy = /^\((?:(\w[\w-]*):)?(.+)\)$/i,
  Lv = /^\d+(?:\.\d+)?\/\d+(?:\.\d+)?$/,
  Yv = /^(\d+(\.\d+)?)?(xs|sm|md|lg|xl)$/,
  Gv =
    /\d+(%|px|r?em|[sdl]?v([hwib]|min|max)|pt|pc|in|cm|mm|cap|ch|ex|r?lh|cq(w|h|i|b|min|max))|\b(calc|min|max|clamp)\(.+\)|^0$/,
  Xv = /^(rgba?|hsla?|hwb|(ok)?(lab|lch)|color-mix)\(.+\)$/,
  Zv = /^(inset_)?-?((\d+)?\.?(\d+)[a-z]+|0)_-?((\d+)?\.?(\d+)[a-z]+|0)/,
  Vv =
    /^(url|image|image-set|cross-fade|element|(repeating-)?(linear|radial|conic)-gradient)\(.+\)$/,
  tl = (n) => Lv.test(n),
  Ee = (n) => !!n && !Number.isNaN(Number(n)),
  al = (n) => !!n && Number.isInteger(Number(n)),
  zc = (n) => n.endsWith('%') && Ee(n.slice(0, -1)),
  Aa = (n) => Yv.test(n),
  Ey = () => !0,
  Qv = (n) => Gv.test(n) && !Xv.test(n),
  Fc = () => !1,
  Kv = (n) => Zv.test(n),
  Jv = (n) => Vv.test(n),
  $v = (n) => !re(n) && !ce(n),
  Wv = (n) => ll(n, wy, Fc),
  re = (n) => xy.test(n),
  wl = (n) => ll(n, jy, Qv),
  Eh = (n) => ll(n, nx, Ee),
  Fv = (n) => ll(n, Ry, Ey),
  Iv = (n) => ll(n, Ny, Fc),
  Th = (n) => ll(n, Ty, Fc),
  Pv = (n) => ll(n, Ay, Jv),
  Ls = (n) => ll(n, zy, Kv),
  ce = (n) => Sy.test(n),
  pi = (n) => _l(n, jy),
  ex = (n) => _l(n, Ny),
  Ah = (n) => _l(n, Ty),
  tx = (n) => _l(n, wy),
  ax = (n) => _l(n, Ay),
  Ys = (n) => _l(n, zy, !0),
  lx = (n) => _l(n, Ry, !0),
  ll = (n, r, u) => {
    const c = xy.exec(n);
    return c ? (c[1] ? r(c[1]) : u(c[2])) : !1;
  },
  _l = (n, r, u = !1) => {
    const c = Sy.exec(n);
    return c ? (c[1] ? r(c[1]) : u) : !1;
  },
  Ty = (n) => n === 'position' || n === 'percentage',
  Ay = (n) => n === 'image' || n === 'url',
  wy = (n) => n === 'length' || n === 'size' || n === 'bg-size',
  jy = (n) => n === 'length',
  nx = (n) => n === 'number',
  Ny = (n) => n === 'family-name',
  Ry = (n) => n === 'number' || n === 'weight',
  zy = (n) => n === 'shadow',
  ix = () => {
    const n = nt('color'),
      r = nt('font'),
      u = nt('text'),
      c = nt('font-weight'),
      f = nt('tracking'),
      d = nt('leading'),
      h = nt('breakpoint'),
      v = nt('container'),
      p = nt('spacing'),
      b = nt('radius'),
      S = nt('shadow'),
      x = nt('inset-shadow'),
      C = nt('text-shadow'),
      Z = nt('drop-shadow'),
      G = nt('blur'),
      V = nt('perspective'),
      U = nt('aspect'),
      B = nt('ease'),
      ne = nt('animate'),
      ae = () => [
        'auto',
        'avoid',
        'all',
        'avoid-page',
        'page',
        'left',
        'right',
        'column',
      ],
      te = () => [
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
      le = () => [...te(), ce, re],
      W = () => ['auto', 'hidden', 'clip', 'visible', 'scroll'],
      $ = () => ['auto', 'contain', 'none'],
      X = () => [ce, re, p],
      ye = () => [tl, 'full', 'auto', ...X()],
      Ye = () => [al, 'none', 'subgrid', ce, re],
      Re = () => ['auto', { span: ['full', al, ce, re] }, al, ce, re],
      be = () => [al, 'auto', ce, re],
      Ue = () => ['auto', 'min', 'max', 'fr', ce, re],
      ze = () => [
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
      P = () => [
        'start',
        'end',
        'center',
        'stretch',
        'center-safe',
        'end-safe',
      ],
      R = () => ['auto', ...X()],
      q = () => [
        tl,
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
        ...X(),
      ],
      se = () => [
        tl,
        'screen',
        'full',
        'dvw',
        'lvw',
        'svw',
        'min',
        'max',
        'fit',
        ...X(),
      ],
      ee = () => [
        tl,
        'screen',
        'full',
        'lh',
        'dvh',
        'lvh',
        'svh',
        'min',
        'max',
        'fit',
        ...X(),
      ],
      J = () => [n, ce, re],
      w = () => [...te(), Ah, Th, { position: [ce, re] }],
      g = () => ['no-repeat', { repeat: ['', 'x', 'y', 'space', 'round'] }],
      T = () => ['auto', 'cover', 'contain', tx, Wv, { size: [ce, re] }],
      M = () => [zc, pi, wl],
      Q = () => ['', 'none', 'full', b, ce, re],
      K = () => ['', Ee, pi, wl],
      I = () => ['solid', 'dashed', 'dotted', 'double'],
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
      L = () => [Ee, zc, Ah, Th],
      F = () => ['', 'none', G, ce, re],
      Se = () => ['none', Ee, ce, re],
      Ke = () => ['none', Ee, ce, re],
      pe = () => [Ee, ce, re],
      me = () => [tl, 'full', ...X()];
    return {
      cacheSize: 500,
      theme: {
        animate: ['spin', 'ping', 'pulse', 'bounce'],
        aspect: ['video'],
        blur: [Aa],
        breakpoint: [Aa],
        color: [Ey],
        container: [Aa],
        'drop-shadow': [Aa],
        ease: ['in', 'out', 'in-out'],
        font: [$v],
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
        spacing: ['px', Ee],
        text: [Aa],
        'text-shadow': [Aa],
        tracking: ['tighter', 'tight', 'normal', 'wide', 'wider', 'widest'],
      },
      classGroups: {
        aspect: [{ aspect: ['auto', 'square', tl, re, ce, U] }],
        container: ['container'],
        columns: [{ columns: [Ee, re, ce, v] }],
        'break-after': [{ 'break-after': ae() }],
        'break-before': [{ 'break-before': ae() }],
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
        'object-position': [{ object: le() }],
        overflow: [{ overflow: W() }],
        'overflow-x': [{ 'overflow-x': W() }],
        'overflow-y': [{ 'overflow-y': W() }],
        overscroll: [{ overscroll: $() }],
        'overscroll-x': [{ 'overscroll-x': $() }],
        'overscroll-y': [{ 'overscroll-y': $() }],
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
        z: [{ z: [al, 'auto', ce, re] }],
        basis: [{ basis: [tl, 'full', 'auto', v, ...X()] }],
        'flex-direction': [
          { flex: ['row', 'row-reverse', 'col', 'col-reverse'] },
        ],
        'flex-wrap': [{ flex: ['nowrap', 'wrap', 'wrap-reverse'] }],
        flex: [{ flex: [Ee, tl, 'auto', 'initial', 'none', re] }],
        grow: [{ grow: ['', Ee, ce, re] }],
        shrink: [{ shrink: ['', Ee, ce, re] }],
        order: [{ order: [al, 'first', 'last', 'none', ce, re] }],
        'grid-cols': [{ 'grid-cols': Ye() }],
        'col-start-end': [{ col: Re() }],
        'col-start': [{ 'col-start': be() }],
        'col-end': [{ 'col-end': be() }],
        'grid-rows': [{ 'grid-rows': Ye() }],
        'row-start-end': [{ row: Re() }],
        'row-start': [{ 'row-start': be() }],
        'row-end': [{ 'row-end': be() }],
        'grid-flow': [
          { 'grid-flow': ['row', 'col', 'dense', 'row-dense', 'col-dense'] },
        ],
        'auto-cols': [{ 'auto-cols': Ue() }],
        'auto-rows': [{ 'auto-rows': Ue() }],
        gap: [{ gap: X() }],
        'gap-x': [{ 'gap-x': X() }],
        'gap-y': [{ 'gap-y': X() }],
        'justify-content': [{ justify: [...ze(), 'normal'] }],
        'justify-items': [{ 'justify-items': [...P(), 'normal'] }],
        'justify-self': [{ 'justify-self': ['auto', ...P()] }],
        'align-content': [{ content: ['normal', ...ze()] }],
        'align-items': [{ items: [...P(), { baseline: ['', 'last'] }] }],
        'align-self': [{ self: ['auto', ...P(), { baseline: ['', 'last'] }] }],
        'place-content': [{ 'place-content': ze() }],
        'place-items': [{ 'place-items': [...P(), 'baseline'] }],
        'place-self': [{ 'place-self': ['auto', ...P()] }],
        p: [{ p: X() }],
        px: [{ px: X() }],
        py: [{ py: X() }],
        ps: [{ ps: X() }],
        pe: [{ pe: X() }],
        pbs: [{ pbs: X() }],
        pbe: [{ pbe: X() }],
        pt: [{ pt: X() }],
        pr: [{ pr: X() }],
        pb: [{ pb: X() }],
        pl: [{ pl: X() }],
        m: [{ m: R() }],
        mx: [{ mx: R() }],
        my: [{ my: R() }],
        ms: [{ ms: R() }],
        me: [{ me: R() }],
        mbs: [{ mbs: R() }],
        mbe: [{ mbe: R() }],
        mt: [{ mt: R() }],
        mr: [{ mr: R() }],
        mb: [{ mb: R() }],
        ml: [{ ml: R() }],
        'space-x': [{ 'space-x': X() }],
        'space-x-reverse': ['space-x-reverse'],
        'space-y': [{ 'space-y': X() }],
        'space-y-reverse': ['space-y-reverse'],
        size: [{ size: q() }],
        'inline-size': [{ inline: ['auto', ...se()] }],
        'min-inline-size': [{ 'min-inline': ['auto', ...se()] }],
        'max-inline-size': [{ 'max-inline': ['none', ...se()] }],
        'block-size': [{ block: ['auto', ...ee()] }],
        'min-block-size': [{ 'min-block': ['auto', ...ee()] }],
        'max-block-size': [{ 'max-block': ['none', ...ee()] }],
        w: [{ w: [v, 'screen', ...q()] }],
        'min-w': [{ 'min-w': [v, 'screen', 'none', ...q()] }],
        'max-w': [
          { 'max-w': [v, 'screen', 'none', 'prose', { screen: [h] }, ...q()] },
        ],
        h: [{ h: ['screen', 'lh', ...q()] }],
        'min-h': [{ 'min-h': ['screen', 'lh', 'none', ...q()] }],
        'max-h': [{ 'max-h': ['screen', 'lh', ...q()] }],
        'font-size': [{ text: ['base', u, pi, wl] }],
        'font-smoothing': ['antialiased', 'subpixel-antialiased'],
        'font-style': ['italic', 'not-italic'],
        'font-weight': [{ font: [c, lx, Fv] }],
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
              re,
            ],
          },
        ],
        'font-family': [{ font: [ex, Iv, r] }],
        'font-features': [{ 'font-features': [re] }],
        'fvn-normal': ['normal-nums'],
        'fvn-ordinal': ['ordinal'],
        'fvn-slashed-zero': ['slashed-zero'],
        'fvn-figure': ['lining-nums', 'oldstyle-nums'],
        'fvn-spacing': ['proportional-nums', 'tabular-nums'],
        'fvn-fraction': ['diagonal-fractions', 'stacked-fractions'],
        tracking: [{ tracking: [f, ce, re] }],
        'line-clamp': [{ 'line-clamp': [Ee, 'none', ce, Eh] }],
        leading: [{ leading: [d, ...X()] }],
        'list-image': [{ 'list-image': ['none', ce, re] }],
        'list-style-position': [{ list: ['inside', 'outside'] }],
        'list-style-type': [{ list: ['disc', 'decimal', 'none', ce, re] }],
        'text-alignment': [
          { text: ['left', 'center', 'right', 'justify', 'start', 'end'] },
        ],
        'placeholder-color': [{ placeholder: J() }],
        'text-color': [{ text: J() }],
        'text-decoration': [
          'underline',
          'overline',
          'line-through',
          'no-underline',
        ],
        'text-decoration-style': [{ decoration: [...I(), 'wavy'] }],
        'text-decoration-thickness': [
          { decoration: [Ee, 'from-font', 'auto', ce, wl] },
        ],
        'text-decoration-color': [{ decoration: J() }],
        'underline-offset': [{ 'underline-offset': [Ee, 'auto', ce, re] }],
        'text-transform': [
          'uppercase',
          'lowercase',
          'capitalize',
          'normal-case',
        ],
        'text-overflow': ['truncate', 'text-ellipsis', 'text-clip'],
        'text-wrap': [{ text: ['wrap', 'nowrap', 'balance', 'pretty'] }],
        indent: [{ indent: X() }],
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
              ce,
              re,
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
        content: [{ content: ['none', ce, re] }],
        'bg-attachment': [{ bg: ['fixed', 'local', 'scroll'] }],
        'bg-clip': [{ 'bg-clip': ['border', 'padding', 'content', 'text'] }],
        'bg-origin': [{ 'bg-origin': ['border', 'padding', 'content'] }],
        'bg-position': [{ bg: w() }],
        'bg-repeat': [{ bg: g() }],
        'bg-size': [{ bg: T() }],
        'bg-image': [
          {
            bg: [
              'none',
              {
                linear: [
                  { to: ['t', 'tr', 'r', 'br', 'b', 'bl', 'l', 'tl'] },
                  al,
                  ce,
                  re,
                ],
                radial: ['', ce, re],
                conic: [al, ce, re],
              },
              ax,
              Pv,
            ],
          },
        ],
        'bg-color': [{ bg: J() }],
        'gradient-from-pos': [{ from: M() }],
        'gradient-via-pos': [{ via: M() }],
        'gradient-to-pos': [{ to: M() }],
        'gradient-from': [{ from: J() }],
        'gradient-via': [{ via: J() }],
        'gradient-to': [{ to: J() }],
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
        'border-style': [{ border: [...I(), 'hidden', 'none'] }],
        'divide-style': [{ divide: [...I(), 'hidden', 'none'] }],
        'border-color': [{ border: J() }],
        'border-color-x': [{ 'border-x': J() }],
        'border-color-y': [{ 'border-y': J() }],
        'border-color-s': [{ 'border-s': J() }],
        'border-color-e': [{ 'border-e': J() }],
        'border-color-bs': [{ 'border-bs': J() }],
        'border-color-be': [{ 'border-be': J() }],
        'border-color-t': [{ 'border-t': J() }],
        'border-color-r': [{ 'border-r': J() }],
        'border-color-b': [{ 'border-b': J() }],
        'border-color-l': [{ 'border-l': J() }],
        'divide-color': [{ divide: J() }],
        'outline-style': [{ outline: [...I(), 'none', 'hidden'] }],
        'outline-offset': [{ 'outline-offset': [Ee, ce, re] }],
        'outline-w': [{ outline: ['', Ee, pi, wl] }],
        'outline-color': [{ outline: J() }],
        shadow: [{ shadow: ['', 'none', S, Ys, Ls] }],
        'shadow-color': [{ shadow: J() }],
        'inset-shadow': [{ 'inset-shadow': ['none', x, Ys, Ls] }],
        'inset-shadow-color': [{ 'inset-shadow': J() }],
        'ring-w': [{ ring: K() }],
        'ring-w-inset': ['ring-inset'],
        'ring-color': [{ ring: J() }],
        'ring-offset-w': [{ 'ring-offset': [Ee, wl] }],
        'ring-offset-color': [{ 'ring-offset': J() }],
        'inset-ring-w': [{ 'inset-ring': K() }],
        'inset-ring-color': [{ 'inset-ring': J() }],
        'text-shadow': [{ 'text-shadow': ['none', C, Ys, Ls] }],
        'text-shadow-color': [{ 'text-shadow': J() }],
        opacity: [{ opacity: [Ee, ce, re] }],
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
        'mask-image-linear-pos': [{ 'mask-linear': [Ee] }],
        'mask-image-linear-from-pos': [{ 'mask-linear-from': L() }],
        'mask-image-linear-to-pos': [{ 'mask-linear-to': L() }],
        'mask-image-linear-from-color': [{ 'mask-linear-from': J() }],
        'mask-image-linear-to-color': [{ 'mask-linear-to': J() }],
        'mask-image-t-from-pos': [{ 'mask-t-from': L() }],
        'mask-image-t-to-pos': [{ 'mask-t-to': L() }],
        'mask-image-t-from-color': [{ 'mask-t-from': J() }],
        'mask-image-t-to-color': [{ 'mask-t-to': J() }],
        'mask-image-r-from-pos': [{ 'mask-r-from': L() }],
        'mask-image-r-to-pos': [{ 'mask-r-to': L() }],
        'mask-image-r-from-color': [{ 'mask-r-from': J() }],
        'mask-image-r-to-color': [{ 'mask-r-to': J() }],
        'mask-image-b-from-pos': [{ 'mask-b-from': L() }],
        'mask-image-b-to-pos': [{ 'mask-b-to': L() }],
        'mask-image-b-from-color': [{ 'mask-b-from': J() }],
        'mask-image-b-to-color': [{ 'mask-b-to': J() }],
        'mask-image-l-from-pos': [{ 'mask-l-from': L() }],
        'mask-image-l-to-pos': [{ 'mask-l-to': L() }],
        'mask-image-l-from-color': [{ 'mask-l-from': J() }],
        'mask-image-l-to-color': [{ 'mask-l-to': J() }],
        'mask-image-x-from-pos': [{ 'mask-x-from': L() }],
        'mask-image-x-to-pos': [{ 'mask-x-to': L() }],
        'mask-image-x-from-color': [{ 'mask-x-from': J() }],
        'mask-image-x-to-color': [{ 'mask-x-to': J() }],
        'mask-image-y-from-pos': [{ 'mask-y-from': L() }],
        'mask-image-y-to-pos': [{ 'mask-y-to': L() }],
        'mask-image-y-from-color': [{ 'mask-y-from': J() }],
        'mask-image-y-to-color': [{ 'mask-y-to': J() }],
        'mask-image-radial': [{ 'mask-radial': [ce, re] }],
        'mask-image-radial-from-pos': [{ 'mask-radial-from': L() }],
        'mask-image-radial-to-pos': [{ 'mask-radial-to': L() }],
        'mask-image-radial-from-color': [{ 'mask-radial-from': J() }],
        'mask-image-radial-to-color': [{ 'mask-radial-to': J() }],
        'mask-image-radial-shape': [{ 'mask-radial': ['circle', 'ellipse'] }],
        'mask-image-radial-size': [
          {
            'mask-radial': [
              { closest: ['side', 'corner'], farthest: ['side', 'corner'] },
            ],
          },
        ],
        'mask-image-radial-pos': [{ 'mask-radial-at': te() }],
        'mask-image-conic-pos': [{ 'mask-conic': [Ee] }],
        'mask-image-conic-from-pos': [{ 'mask-conic-from': L() }],
        'mask-image-conic-to-pos': [{ 'mask-conic-to': L() }],
        'mask-image-conic-from-color': [{ 'mask-conic-from': J() }],
        'mask-image-conic-to-color': [{ 'mask-conic-to': J() }],
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
        'mask-size': [{ mask: T() }],
        'mask-type': [{ 'mask-type': ['alpha', 'luminance'] }],
        'mask-image': [{ mask: ['none', ce, re] }],
        filter: [{ filter: ['', 'none', ce, re] }],
        blur: [{ blur: F() }],
        brightness: [{ brightness: [Ee, ce, re] }],
        contrast: [{ contrast: [Ee, ce, re] }],
        'drop-shadow': [{ 'drop-shadow': ['', 'none', Z, Ys, Ls] }],
        'drop-shadow-color': [{ 'drop-shadow': J() }],
        grayscale: [{ grayscale: ['', Ee, ce, re] }],
        'hue-rotate': [{ 'hue-rotate': [Ee, ce, re] }],
        invert: [{ invert: ['', Ee, ce, re] }],
        saturate: [{ saturate: [Ee, ce, re] }],
        sepia: [{ sepia: ['', Ee, ce, re] }],
        'backdrop-filter': [{ 'backdrop-filter': ['', 'none', ce, re] }],
        'backdrop-blur': [{ 'backdrop-blur': F() }],
        'backdrop-brightness': [{ 'backdrop-brightness': [Ee, ce, re] }],
        'backdrop-contrast': [{ 'backdrop-contrast': [Ee, ce, re] }],
        'backdrop-grayscale': [{ 'backdrop-grayscale': ['', Ee, ce, re] }],
        'backdrop-hue-rotate': [{ 'backdrop-hue-rotate': [Ee, ce, re] }],
        'backdrop-invert': [{ 'backdrop-invert': ['', Ee, ce, re] }],
        'backdrop-opacity': [{ 'backdrop-opacity': [Ee, ce, re] }],
        'backdrop-saturate': [{ 'backdrop-saturate': [Ee, ce, re] }],
        'backdrop-sepia': [{ 'backdrop-sepia': ['', Ee, ce, re] }],
        'border-collapse': [{ border: ['collapse', 'separate'] }],
        'border-spacing': [{ 'border-spacing': X() }],
        'border-spacing-x': [{ 'border-spacing-x': X() }],
        'border-spacing-y': [{ 'border-spacing-y': X() }],
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
              ce,
              re,
            ],
          },
        ],
        'transition-behavior': [{ transition: ['normal', 'discrete'] }],
        duration: [{ duration: [Ee, 'initial', ce, re] }],
        ease: [{ ease: ['linear', 'initial', B, ce, re] }],
        delay: [{ delay: [Ee, ce, re] }],
        animate: [{ animate: ['none', ne, ce, re] }],
        backface: [{ backface: ['hidden', 'visible'] }],
        perspective: [{ perspective: [V, ce, re] }],
        'perspective-origin': [{ 'perspective-origin': le() }],
        rotate: [{ rotate: Se() }],
        'rotate-x': [{ 'rotate-x': Se() }],
        'rotate-y': [{ 'rotate-y': Se() }],
        'rotate-z': [{ 'rotate-z': Se() }],
        scale: [{ scale: Ke() }],
        'scale-x': [{ 'scale-x': Ke() }],
        'scale-y': [{ 'scale-y': Ke() }],
        'scale-z': [{ 'scale-z': Ke() }],
        'scale-3d': ['scale-3d'],
        skew: [{ skew: pe() }],
        'skew-x': [{ 'skew-x': pe() }],
        'skew-y': [{ 'skew-y': pe() }],
        transform: [{ transform: [ce, re, '', 'none', 'gpu', 'cpu'] }],
        'transform-origin': [{ origin: le() }],
        'transform-style': [{ transform: ['3d', 'flat'] }],
        translate: [{ translate: me() }],
        'translate-x': [{ 'translate-x': me() }],
        'translate-y': [{ 'translate-y': me() }],
        'translate-z': [{ 'translate-z': me() }],
        'translate-none': ['translate-none'],
        accent: [{ accent: J() }],
        appearance: [{ appearance: ['none', 'auto'] }],
        'caret-color': [{ caret: J() }],
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
              ce,
              re,
            ],
          },
        ],
        'field-sizing': [{ 'field-sizing': ['fixed', 'content'] }],
        'pointer-events': [{ 'pointer-events': ['auto', 'none'] }],
        resize: [{ resize: ['none', '', 'y', 'x'] }],
        'scroll-behavior': [{ scroll: ['auto', 'smooth'] }],
        'scroll-m': [{ 'scroll-m': X() }],
        'scroll-mx': [{ 'scroll-mx': X() }],
        'scroll-my': [{ 'scroll-my': X() }],
        'scroll-ms': [{ 'scroll-ms': X() }],
        'scroll-me': [{ 'scroll-me': X() }],
        'scroll-mbs': [{ 'scroll-mbs': X() }],
        'scroll-mbe': [{ 'scroll-mbe': X() }],
        'scroll-mt': [{ 'scroll-mt': X() }],
        'scroll-mr': [{ 'scroll-mr': X() }],
        'scroll-mb': [{ 'scroll-mb': X() }],
        'scroll-ml': [{ 'scroll-ml': X() }],
        'scroll-p': [{ 'scroll-p': X() }],
        'scroll-px': [{ 'scroll-px': X() }],
        'scroll-py': [{ 'scroll-py': X() }],
        'scroll-ps': [{ 'scroll-ps': X() }],
        'scroll-pe': [{ 'scroll-pe': X() }],
        'scroll-pbs': [{ 'scroll-pbs': X() }],
        'scroll-pbe': [{ 'scroll-pbe': X() }],
        'scroll-pt': [{ 'scroll-pt': X() }],
        'scroll-pr': [{ 'scroll-pr': X() }],
        'scroll-pb': [{ 'scroll-pb': X() }],
        'scroll-pl': [{ 'scroll-pl': X() }],
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
            'will-change': ['auto', 'scroll', 'contents', 'transform', ce, re],
          },
        ],
        fill: [{ fill: ['none', ...J()] }],
        'stroke-w': [{ stroke: [Ee, pi, wl, Eh] }],
        stroke: [{ stroke: ['none', ...J()] }],
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
  sx = Hv(ix);
function Dt(...n) {
  return sx(gv(n));
}
function rx({ className: n, ...r }) {
  return m.jsx('div', {
    role: 'alert',
    className: Dt(
      'rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700',
      n,
    ),
    ...r,
  });
}
function ux({ className: n, ...r }) {
  return m.jsx('h3', { className: Dt('font-medium text-slate-950', n), ...r });
}
function cx({ className: n, ...r }) {
  return m.jsx('div', {
    className: Dt('mt-1 text-sm text-slate-600', n),
    ...r,
  });
}
function wh({ className: n, ...r }) {
  return m.jsx('span', {
    className: Dt(
      'inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700',
      n,
    ),
    ...r,
  });
}
const jh = '..';
function ox({ pageHref: n, pageOrigin: r }) {
  return {
    configError: '',
    pageOrigin: r,
    resolvedServerBaseUrl: new URL(jh, n).toString(),
    serverBaseUrl: jh,
    status: 'ready',
  };
}
function fx() {
  function n() {
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
    if (typeof S != 'string') throw n();
    return S;
  }
  function c(S) {
    return S === null ? null : u(S);
  }
  function f(S) {
    return d(S).map((x) => u(x));
  }
  function d(S) {
    if (!Array.isArray(S)) throw n();
    return S;
  }
  function h(S) {
    const x = r(S);
    if (!x) throw n();
    return {
      id: u(x.id),
      credential_id: u(x.credential_id),
      transports: f(x.transports),
      rp_id: u(x.rp_id),
      last_used_at: c(x.last_used_at),
      created_at: u(x.created_at),
    };
  }
  function v(S) {
    const x = r(S);
    if (!x) throw n();
    return {
      id: u(x.id),
      name: u(x.name),
      public_key: u(x.public_key),
      last_used_at: c(x.last_used_at),
      created_at: u(x.created_at),
    };
  }
  function p(S) {
    const x = r(S);
    if (!x) throw n();
    return {
      id: u(x.id),
      auth_method: u(x.auth_method),
      created_at: u(x.created_at),
      expires_at: u(x.expires_at),
      ip: c(x.ip),
      user_agent: c(x.user_agent),
    };
  }
  function b(S) {
    const x = r(S);
    if (!x) throw n();
    return {
      user_id: u(x.user_id),
      email: c(x.email),
      webauthn_credentials: d(x.webauthn_credentials).map(h),
      ed25519_credentials: d(x.ed25519_credentials).map(v),
      active_sessions: d(x.active_sessions).map(p),
    };
  }
  return { parseMeResponse: b };
}
const { parseMeResponse: dx } = fx();
let Nh = null;
function mx(n, r = {}) {
  return hx().createBrowserSdkInternal({ ...r, baseUrl: n });
}
function hx() {
  return (Nh ?? (Nh = yx()), Nh);
}
function yx(n = dx) {
  const r = 'auth-mini.sdk';
  function u(g, T) {
    const M = new Error(`${g}: ${T}`);
    return ((M.name = 'AuthMiniSdkError'), (M.code = g), M);
  }
  function c(g, T) {
    const M = u(
      'request_failed',
      typeof (T == null ? void 0 : T.error) == 'string'
        ? T.error
        : `Request failed with status ${g}`,
    );
    return (
      (M.status = g),
      T && typeof T == 'object' && Object.assign(M, T),
      'error' in M || (M.error = 'request_failed'),
      M
    );
  }
  function f(g) {
    if (g.storage) return g.storage;
    let T;
    try {
      T = g.getDefaultStorage();
    } catch {
      throw u('sdk_init_failed', 'localStorage is unavailable');
    }
    if (!T) throw u('sdk_init_failed', 'localStorage is unavailable');
    return T;
  }
  function d(g) {
    var M;
    const T =
      g ?? ((M = globalThis.fetch) == null ? void 0 : M.bind(globalThis));
    if (!T) throw u('sdk_init_failed', 'fetch is unavailable');
    return T;
  }
  function h(g) {
    return `${r}:${v(g).toString()}`;
  }
  function v(g) {
    const T = new URL(g);
    return (
      (T.search = ''),
      (T.hash = ''),
      (T.pathname = T.pathname.endsWith('/') ? T.pathname : `${T.pathname}/`),
      T
    );
  }
  function p(g, T) {
    const M = g.getItem(T);
    if (!M) return null;
    try {
      const Q = JSON.parse(M);
      if (!Q || typeof Q != 'object') return null;
      const K = Q,
        I = W(K.sessionId),
        fe = W(K.accessToken),
        L = W(K.refreshToken),
        F = W(K.receivedAt),
        Se = W(K.expiresAt);
      return I === void 0 ||
        fe === void 0 ||
        L === void 0 ||
        F === void 0 ||
        Se === void 0 ||
        (L && !I)
        ? null
        : {
            sessionId: I,
            accessToken: fe,
            refreshToken: L,
            receivedAt: F,
            expiresAt: Se,
          };
    } catch {
      return null;
    }
  }
  function b(g, T, M) {
    g.setItem(T, JSON.stringify(M));
  }
  function S(g, T) {
    g.removeItem(T);
  }
  function x(g, T) {
    const M = new Set();
    let Q = K();
    return {
      getState() {
        return w(Q);
      },
      onChange(F) {
        return (M.add(F), () => M.delete(F));
      },
      setRecovering(F) {
        fe({ status: 'recovering', authenticated: !1, ...ee(F) });
      },
      setAuthenticated(F) {
        fe({ status: 'authenticated', authenticated: !0, ...ee(F) });
      },
      setAnonymous() {
        (S(g, T), L(se('anonymous')));
      },
      applyPersistedState(F) {
        L(I(F));
      },
      setAnonymousLocal() {
        L(se('anonymous'));
      },
    };
    function K() {
      return I(p(g, T));
    }
    function I(F) {
      return !(F != null && F.refreshToken) || !F.sessionId
        ? se('anonymous')
        : J({ status: 'recovering', authenticated: !1, ...F });
    }
    function fe(F) {
      const Se = ee(F);
      (b(g, T, Se),
        L({ status: F.status, authenticated: F.authenticated, ...Se }));
    }
    function L(F) {
      Q = J(F);
      for (const Se of M) Se(w(Q));
    }
  }
  function C(g) {
    return {
      getJson(K, I = {}) {
        return T('GET', K, I);
      },
      postJson(K, I, fe = {}) {
        return T('POST', K, { ...fe, body: I });
      },
    };
    async function T(K, I, fe) {
      const L = await g.fetch(new URL(I.replace(/^\//, ''), g.baseUrl), {
          method: K,
          headers: M(fe),
          ...(fe.body === void 0 ? {} : { body: JSON.stringify(fe.body) }),
        }),
        F = await Q(L);
      if (!L.ok) throw c(L.status, F);
      return F;
    }
    function M(K) {
      const I = { accept: 'application/json' };
      return (
        K.body !== void 0 && (I['content-type'] = 'application/json'),
        K.accessToken && (I.authorization = `Bearer ${K.accessToken}`),
        I
      );
    }
    async function Q(K) {
      const I = await K.text();
      if (!I) return null;
      try {
        return JSON.parse(I);
      } catch {
        return null;
      }
    }
  }
  function Z(g, T, M) {
    const Q = T - M,
      K = Q < 10 * 6e4 ? Q / 2 : 5 * 6e4;
    return g >= T - K;
  }
  function G(g, T) {
    if (!g.expiresAt || !g.receivedAt) return !0;
    const M = Date.parse(g.expiresAt),
      Q = Date.parse(g.receivedAt);
    return !Number.isFinite(M) || !Number.isFinite(Q) ? !0 : Z(T, M, Q);
  }
  function V(g, T) {
    const M = g;
    if (
      !M ||
      typeof M != 'object' ||
      typeof M.access_token != 'string' ||
      typeof M.session_id != 'string' ||
      typeof M.refresh_token != 'string' ||
      typeof M.expires_in != 'number'
    )
      throw u('request_failed', 'Invalid session payload');
    const Q = T();
    return {
      sessionId: M.session_id,
      accessToken: M.access_token,
      refreshToken: M.refresh_token,
      receivedAt: new Date(Q).toISOString(),
      expiresAt: new Date(Q + M.expires_in * 1e3).toISOString(),
    };
  }
  function U(g) {
    let T = null,
      M = null;
    const Q = {
      getState() {
        return g.state.getState();
      },
      onChange(L) {
        return g.state.onChange(L);
      },
      async acceptSessionResponse(L, F = {}) {
        const Se = V(L, g.now);
        g.state.setRecovering(Se);
        try {
          return (g.state.setAuthenticated(Se), Se);
        } catch (Ke) {
          throw (
            (F.clearOnMeFailure !== 'auth-invalidating' || Re(Ke)) &&
              g.state.setAnonymous(),
            Ke
          );
        }
      },
      async refresh() {
        if (T) return T;
        const L = g.state.getState();
        if (!L.refreshToken)
          throw u('missing_session', 'Missing refresh token');
        if (!L.sessionId) throw u('missing_session', 'Missing session id');
        return (
          (T = (async () => {
            try {
              const F = await g.http.postJson('/session/refresh', {
                session_id: L.sessionId,
                refresh_token: L.refreshToken,
              });
              return await Q.acceptSessionResponse(F, {
                clearOnMeFailure: 'auth-invalidating',
              });
            } catch (F) {
              if (Ue(F)) {
                const Se = I(L);
                M = Se.finally(() => {
                  M === Se && (M = null);
                });
              } else (Re(F) || be(F)) && g.state.setAnonymous();
              throw F;
            } finally {
              T = null;
            }
          })()),
          T
        );
      },
      async recover() {
        const L = g.state.getState();
        if (!L.refreshToken) {
          g.state.setAnonymous();
          return;
        }
        try {
          if (!L.accessToken || G(L, g.now())) {
            await Q.refresh();
            return;
          }
          g.state.setAuthenticated({
            sessionId: L.sessionId,
            accessToken: L.accessToken,
            refreshToken: L.refreshToken,
            receivedAt: L.receivedAt ?? new Date(g.now()).toISOString(),
            expiresAt: L.expiresAt ?? new Date(g.now()).toISOString(),
          });
        } catch (F) {
          if (Ue(F)) {
            await M;
            const Se = g.state.getState();
            P(Se, L) && g.state.setAnonymousLocal();
            return;
          }
          if ((Re(F) || be(F)) && (g.state.setAnonymous(), be(F))) throw F;
        }
      },
      async fetchMe() {
        const L = g.state.getState();
        if (!L.refreshToken)
          throw u('missing_session', 'Missing refresh token');
        if (!L.accessToken || G(L, g.now()))
          return await K((await Q.refresh()).accessToken);
        if (!L.sessionId) throw u('missing_session', 'Missing session id');
        return await K(L.accessToken);
      },
      async logout() {
        const L = g.state.getState();
        if (!L.refreshToken && !L.accessToken) {
          g.state.setAnonymous();
          return;
        }
        try {
          let F = L.accessToken;
          if (L.refreshToken && (!F || G(L, g.now())))
            try {
              F = (await Q.refresh()).accessToken;
            } catch {
              F = null;
            }
          F &&
            (await g.http.postJson('/session/logout', void 0, {
              accessToken: F,
            }));
        } catch {
        } finally {
          g.state.setAnonymous();
        }
      },
    };
    return Q;
    async function K(L) {
      if (!L) throw u('missing_session', 'Missing access token');
      return n(await g.http.getJson('/me', { accessToken: L }));
    }
    async function I(L) {
      var Ke;
      g.state.setRecovering({
        sessionId: L.sessionId,
        accessToken: L.accessToken,
        refreshToken: L.refreshToken ?? '',
        receivedAt: L.receivedAt ?? new Date(g.now()).toISOString(),
        expiresAt: L.expiresAt ?? new Date(g.now()).toISOString(),
      });
      const F = g.recoveryTimeoutMs ?? 50,
        Se = Date.now() + F;
      for (;;) {
        const pe = g.state.getState();
        if (!P(pe, L) || fe(L) === 'usable') return;
        const Le = Se - Date.now();
        if (Le <= 0) break;
        await ((Ke = g.waitForExternalStorage) == null
          ? void 0
          : Ke.call(g, Le));
      }
      g.state.setAnonymousLocal();
    }
    function fe(L) {
      var Se;
      const F = (Se = g.readSharedState) == null ? void 0 : Se.call(g);
      return !(F != null && F.sessionId) || !F.refreshToken || !ze(L, F)
        ? 'none'
        : F.accessToken && !G(F, g.now())
          ? (g.state.setAuthenticated({
              sessionId: F.sessionId,
              accessToken: F.accessToken,
              refreshToken: F.refreshToken,
              receivedAt: F.receivedAt ?? new Date(g.now()).toISOString(),
              expiresAt: F.expiresAt ?? new Date(g.now()).toISOString(),
            }),
            'usable')
          : (g.state.applyPersistedState(F), 'provisional');
    }
  }
  function B(g) {
    return {
      start(T) {
        return g.http.postJson('/email/start', T);
      },
      async verify(T) {
        const M = await g.http.postJson('/email/verify', T);
        return await g.session.acceptSessionResponse(M);
      },
    };
  }
  function ne(g) {
    return {
      async authenticate(I = {}) {
        var Se;
        T('authenticate');
        const fe = await g.http.postJson(
            '/webauthn/authenticate/options',
            K(I),
          ),
          L = await M(
            'authenticate',
            (Se = g.navigatorCredentials) == null ? void 0 : Se.get,
            { publicKey: X(fe.publicKey) },
          ),
          F = await g.http.postJson('/webauthn/authenticate/verify', {
            request_id: fe.request_id,
            credential: ye(L),
          });
        return await g.session.acceptSessionResponse(F);
      },
      async register(I = {}) {
        var Ke;
        T('register');
        const fe = await Q(),
          L = await g.http.postJson('/webauthn/register/options', K(I), {
            accessToken: fe,
          }),
          F = await M(
            'register',
            (Ke = g.navigatorCredentials) == null ? void 0 : Ke.create,
            { publicKey: $(L.publicKey) },
          ),
          Se = await Q();
        return await g.http.postJson(
          '/webauthn/register/verify',
          { request_id: L.request_id, credential: ye(F) },
          { accessToken: Se },
        );
      },
    };
    function T(I) {
      var L, F;
      const fe =
        I === 'register'
          ? typeof ((L = g.navigatorCredentials) == null ? void 0 : L.create) ==
            'function'
          : typeof ((F = g.navigatorCredentials) == null ? void 0 : F.get) ==
            'function';
      if (!g.publicKeyCredential || !fe)
        throw u(
          'webauthn_unsupported',
          'WebAuthn is unavailable in this browser',
        );
    }
    async function M(I, fe, L) {
      if (!fe)
        throw u(
          'webauthn_unsupported',
          'WebAuthn is unavailable in this browser',
        );
      try {
        const F = await fe(L);
        if (!F)
          throw u(
            'webauthn_cancelled',
            I === 'register'
              ? 'Passkey registration cancelled'
              : 'Passkey authentication cancelled',
          );
        return F;
      } catch (F) {
        throw Ye(F)
          ? u(
              'webauthn_cancelled',
              I === 'register'
                ? 'Passkey registration cancelled'
                : 'Passkey authentication cancelled',
            )
          : F;
      }
    }
    async function Q() {
      const I = g.state.getState();
      if (!I.refreshToken && !I.accessToken)
        throw u('missing_session', 'Missing authenticated session');
      return !I.accessToken || G(I, g.now())
        ? (await g.session.refresh()).accessToken
        : I.accessToken;
    }
    function K(I) {
      var L;
      return {
        rp_id:
          typeof (I == null ? void 0 : I.rpId) == 'string' && I.rpId.length > 0
            ? I.rpId
            : (L = globalThis.location) == null
              ? void 0
              : L.hostname,
      };
    }
  }
  function ae(g) {
    var pe;
    const T = g.storageKey ?? r,
      M = x(g.storage, T),
      Q = new Set(),
      K = C({ baseUrl: g.baseUrl, fetch: g.fetch }),
      I = (me) => {
        me != null &&
        me.sessionId &&
        me.refreshToken &&
        me.accessToken &&
        !G(me, (g.now ?? (() => Date.now()))())
          ? M.setAuthenticated({
              sessionId: me.sessionId,
              accessToken: me.accessToken,
              refreshToken: me.refreshToken,
              receivedAt:
                me.receivedAt ??
                new Date((g.now ?? (() => Date.now()))()).toISOString(),
              expiresAt:
                me.expiresAt ??
                new Date((g.now ?? (() => Date.now()))()).toISOString(),
            })
          : M.applyPersistedState(me);
        for (const Le of Q) Le();
      };
    (pe = g.storageSync) == null || pe.subscribe(I);
    const fe = U({
        http: K,
        now: g.now ?? (() => Date.now()),
        readSharedState: () => {
          var me, Le;
          return (
            ((Le = (me = g.storageSync) == null ? void 0 : me.getSnapshot) ==
            null
              ? void 0
              : Le.call(me)) ?? p(g.storage, T)
          );
        },
        recoveryTimeoutMs: g.recoveryTimeoutMs,
        state: M,
        waitForExternalStorage(me) {
          return new Promise((Le) => {
            let ia = !1;
            const il = () => {
                ia || ((ia = !0), clearTimeout(sl), Q.delete(il), Le());
              },
              sl = setTimeout(il, me);
            Q.add(il);
          });
        },
      }),
      L = g.now ?? (() => Date.now()),
      F = ne({
        http: K,
        navigatorCredentials: g.navigatorCredentials,
        now: L,
        publicKeyCredential: g.publicKeyCredential,
        session: fe,
        state: M,
      }),
      Se = {
        email: B({ http: K, session: fe }),
        me: {
          fetch() {
            return fe.fetchMe();
          },
        },
        session: {
          getState() {
            return M.getState();
          },
          onChange(me) {
            return M.onChange(me);
          },
          refresh() {
            return fe.refresh();
          },
          logout() {
            return fe.logout();
          },
        },
        passkey: F,
        webauthn: F,
      },
      Ke =
        g.autoRecover !== !1 && M.getState().status === 'recovering'
          ? Promise.resolve().then(() => fe.recover())
          : Promise.resolve();
    return (Ke.catch(() => {}), Object.assign(Se, { ready: Ke }));
  }
  function te(g) {
    var fe;
    const T = typeof window > 'u' ? globalThis : window,
      M = g.baseUrl;
    if (!M) throw u('sdk_init_failed', 'Cannot determine SDK base URL');
    const Q = v(M).toString(),
      K = h(Q),
      I = f({ storage: g.storage, getDefaultStorage: () => T.localStorage });
    return ae({
      baseUrl: Q,
      fetch: d(g.fetch),
      navigatorCredentials:
        (fe = T.navigator) == null ? void 0 : fe.credentials,
      now: g.now,
      publicKeyCredential: T.PublicKeyCredential,
      recoveryTimeoutMs: g.recoveryTimeoutMs,
      storage: I,
      storageKey: K,
      storageSync: le(T, I, K),
    });
  }
  function le(g, T, M) {
    return typeof (g == null ? void 0 : g.addEventListener) != 'function'
      ? null
      : {
          getSnapshot() {
            return p(T, M);
          },
          subscribe(Q) {
            const K = (I) => {
              I.key !== M || I.storageArea !== T || Q(p(T, M));
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
  function $(g) {
    return {
      ...g,
      challenge: R(g.challenge),
      user: { ...g.user, id: R(g.user.id) },
      excludeCredentials: Array.isArray(g.excludeCredentials)
        ? g.excludeCredentials.map((T) => ({ ...T, id: R(T.id) }))
        : void 0,
    };
  }
  function X(g) {
    return {
      ...g,
      challenge: R(g.challenge),
      allowCredentials: Array.isArray(g.allowCredentials)
        ? g.allowCredentials.map((T) => ({ ...T, id: R(T.id) }))
        : void 0,
    };
  }
  function ye(g) {
    const T = g.response,
      M = {
        id: g.id,
        rawId: q(g.rawId),
        type: g.type,
        response: { clientDataJSON: q(T.clientDataJSON) },
      };
    return (
      typeof g.getClientExtensionResults == 'function'
        ? (M.clientExtensionResults = g.getClientExtensionResults())
        : g.clientExtensionResults &&
          (M.clientExtensionResults = g.clientExtensionResults),
      typeof T.getTransports == 'function' &&
        (M.response.transports = T.getTransports()),
      'attestationObject' in T &&
        T.attestationObject &&
        (M.response.attestationObject = q(T.attestationObject)),
      'authenticatorData' in T &&
        T.authenticatorData &&
        (M.response.authenticatorData = q(T.authenticatorData)),
      'signature' in T &&
        T.signature &&
        (M.response.signature = q(T.signature)),
      'userHandle' in T &&
        T.userHandle &&
        (M.response.userHandle = q(T.userHandle)),
      M
    );
  }
  function Ye(g) {
    const T = g;
    return (
      (T == null ? void 0 : T.code) === 'webauthn_cancelled' ||
      (T == null ? void 0 : T.name) === 'AbortError' ||
      (T == null ? void 0 : T.name) === 'NotAllowedError'
    );
  }
  function Re(g) {
    const T = g;
    return (
      (T == null ? void 0 : T.error) === 'invalid_refresh_token' ||
      (T == null ? void 0 : T.error) === 'session_invalidated' ||
      ((T == null ? void 0 : T.status) === 401 &&
        (T == null ? void 0 : T.error) !== 'session_superseded')
    );
  }
  function be(g) {
    const T = g;
    return (
      (T == null ? void 0 : T.code) === 'request_failed' &&
      ((T == null ? void 0 : T.message) ===
        'request_failed: Invalid session payload' ||
        (T == null ? void 0 : T.message) ===
          'request_failed: Invalid /me payload')
    );
  }
  function Ue(g) {
    const T = g;
    return (T == null ? void 0 : T.error) === 'session_superseded';
  }
  function ze(g, T) {
    return (
      g.sessionId !== T.sessionId ||
      g.accessToken !== T.accessToken ||
      g.refreshToken !== T.refreshToken ||
      g.receivedAt !== T.receivedAt ||
      g.expiresAt !== T.expiresAt
    );
  }
  function P(g, T) {
    return g.status === 'recovering' && g.sessionId === T.sessionId;
  }
  function R(g) {
    const T = g.replace(/-/g, '+').replace(/_/g, '/'),
      M = T.padEnd(Math.ceil(T.length / 4) * 4, '='),
      Q =
        typeof Buffer < 'u'
          ? Buffer.from(M, 'base64')
          : Uint8Array.from(globalThis.atob(M), (K) => K.charCodeAt(0));
    return new Uint8Array(Q);
  }
  function q(g) {
    const T =
      g instanceof Uint8Array
        ? g
        : g instanceof ArrayBuffer
          ? new Uint8Array(g)
          : new Uint8Array(g.buffer, g.byteOffset, g.byteLength);
    return (
      typeof Buffer < 'u'
        ? Buffer.from(T).toString('base64')
        : globalThis.btoa(String.fromCharCode(...T))
    )
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');
  }
  function se(g) {
    return J({
      status: g,
      authenticated: g === 'authenticated',
      sessionId: null,
      accessToken: null,
      refreshToken: null,
      receivedAt: null,
      expiresAt: null,
    });
  }
  function ee(g) {
    return {
      sessionId: g.sessionId,
      accessToken: g.accessToken,
      refreshToken: g.refreshToken,
      receivedAt: g.receivedAt,
      expiresAt: g.expiresAt,
    };
  }
  function J(g) {
    return Object.freeze(g);
  }
  function w(g) {
    return J({ status: g.status, authenticated: g.authenticated, ...ee(g) });
  }
  return { createAuthMiniInternal: ae, createBrowserSdkInternal: te };
}
function px(n) {
  return mx(n);
}
function gx(n) {
  const r = new URL(n);
  return (
    (r.search = ''),
    (r.hash = ''),
    (r.pathname = r.pathname.endsWith('/') ? r.pathname : `${r.pathname}/`),
    `auth-mini.sdk:${r.toString()}`
  );
}
function bx(n, r, u) {
  const c = new Date().toISOString(),
    f = new Date(Date.now() + u.expires_in * 1e3).toISOString();
  n.setItem(
    gx(r),
    JSON.stringify({
      sessionId: u.session_id,
      accessToken: u.access_token,
      refreshToken: u.refresh_token,
      receivedAt: c,
      expiresAt: f,
    }),
  );
}
function Rh(n) {
  const r = px(n);
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
    const h = r.session.getState();
    if (!h.refreshToken && !h.accessToken)
      throw new Error('Missing authenticated session');
    if (!d && h.accessToken) return h.accessToken;
    const v = await r.session.refresh();
    if (!v.accessToken) throw new Error('Missing authenticated session');
    return v.accessToken;
  }
  async function f(d, h, v) {
    const p = await fetch(new URL(d, n), {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          ...(v ? { authorization: `Bearer ${v}` } : {}),
        },
        body: JSON.stringify(h),
      }),
      b = await p.json();
    if (!p.ok)
      throw typeof b == 'object' && b !== null
        ? { status: p.status, ...b }
        : { status: p.status, error: 'request_failed' };
    return b;
  }
  return {
    ...r,
    ed25519: {
      async register(d) {
        const h = { name: d.name, public_key: d.public_key };
        try {
          return await f('/ed25519/credentials', h, await c());
        } catch (v) {
          if (!u(v) || !r.session.getState().refreshToken) throw v;
          return await f('/ed25519/credentials', h, await c(!0));
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
const zh = {
    status: 'anonymous',
    authenticated: !1,
    sessionId: null,
    accessToken: null,
    refreshToken: null,
    receivedAt: null,
    expiresAt: null,
  },
  _y = A.createContext(null);
function vx({ children: n, initialLocation: r }) {
  const u = r ?? { href: window.location.href, origin: window.location.origin },
    [c, f] = A.useState(null),
    [d, h] = A.useState(zh),
    v = A.useRef(null);
  let p;
  if (typeof window < 'u')
    try {
      p = window.localStorage;
    } catch {
      p = void 0;
    }
  const b = ox({
    pageHref: u.href ?? `${u.origin}/web/#/`,
    pageOrigin: u.origin,
  });
  function S(C) {
    var Z;
    ((Z = v.current) == null || Z.call(v),
      f(C),
      h(C.session.getState()),
      (v.current = C.session.onChange((G) => {
        h(G);
      })));
  }
  A.useEffect(() => {
    const C = Rh(b.resolvedServerBaseUrl);
    return (
      S(C),
      () => {
        var Z;
        ((Z = v.current) == null || Z.call(v), (v.current = null));
      }
    );
  }, [b.resolvedServerBaseUrl]);
  const x = A.useMemo(
    () => ({
      config: b,
      adoptDemoSession: async (C) => {
        if (!p) throw new Error('Demo setup is not ready');
        bx(p, b.resolvedServerBaseUrl, C);
        const Z = Rh(b.resolvedServerBaseUrl);
        S(Z);
      },
      clearLocalAuthState: async () => {
        if (!c) {
          h(zh);
          return;
        }
        (await c.session.logout(), h(c.session.getState()));
      },
      sdk: c,
      session: d,
    }),
    [b, c, d],
  );
  return m.jsx(_y.Provider, { value: x, children: n });
}
function nl() {
  const n = A.useContext(_y);
  if (!n) throw new Error('useDemo must be used inside DemoProvider');
  return n;
}
function xx() {
  const { config: n, sdk: r } = nl();
  return m.jsxs(rx, {
    className:
      'flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between',
    children: [
      m.jsxs('div', {
        children: [
          m.jsx(ux, { children: 'Demo status' }),
          m.jsx(cx, {
            children: n.configError || `Connected to ${n.serverBaseUrl}`,
          }),
        ],
      }),
      m.jsxs('div', {
        className: 'flex items-center gap-2',
        children: [
          m.jsx(wh, { children: n.status }),
          m.jsx(wh, {
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
const Sx = [
  ['/', 'Home'],
  ['/setup', 'Setup'],
  ['/email', 'Email'],
  ['/ed25519', 'ED25519'],
  ['/passkey', 'Passkey'],
  ['/credentials', 'Credentials'],
  ['/session', 'Session'],
];
function Ex() {
  return m.jsxs('div', {
    className: 'min-h-screen bg-slate-50 text-slate-950',
    children: [
      m.jsx('header', {
        className: 'border-b border-slate-200 bg-white/90 backdrop-blur',
        children: m.jsx('nav', {
          className:
            'mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-6 py-4',
          children: Sx.map(([n, r]) =>
            m.jsx(
              my,
              {
                to: n,
                className: ({ isActive: u }) =>
                  Dt(
                    'rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950',
                    u &&
                      'bg-slate-900 text-white hover:bg-slate-900 hover:text-white',
                  ),
                children: r,
              },
              n,
            ),
          ),
        }),
      }),
      m.jsxs('main', {
        className: 'mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10',
        children: [m.jsx(xx, {}), m.jsx(k0, {})],
      }),
    ],
  });
}
function Zs({ className: n, ...r }) {
  return m.jsx('div', {
    className: Dt('rounded-xl border border-slate-200 bg-white shadow-sm', n),
    ...r,
  });
}
function Vs({ className: n, ...r }) {
  return m.jsx('div', { className: Dt('flex flex-col gap-1.5 p-6', n), ...r });
}
function Cy({ className: n, ...r }) {
  return m.jsx('h2', {
    className: Dt('text-lg font-semibold text-slate-950', n),
    ...r,
  });
}
function Qs({ className: n, ...r }) {
  return m.jsx('p', { className: Dt('text-sm text-slate-600', n), ...r });
}
function Bc({ className: n, ...r }) {
  return m.jsx('div', { className: Dt('p-6 pt-0', n), ...r });
}
function vn({ title: n, description: r, children: u }) {
  return m.jsxs(Zs, {
    children: [
      m.jsxs(Vs, {
        children: [m.jsx(Cy, { children: n }), m.jsx(Qs, { children: r })],
      }),
      m.jsx(Bc, { children: u }),
    ],
  });
}
const yt = A.forwardRef(({ className: n, type: r = 'button', ...u }, c) =>
  m.jsx('button', {
    ref: c,
    type: r,
    className: Dt(
      'inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50',
      n,
    ),
    ...u,
  }),
);
yt.displayName = 'Button';
function Tx(n) {
  return typeof n == 'object' && n !== null ? n : null;
}
function _h(n, r = 20) {
  return n.length <= r * 2 + 1 ? n : `${n.slice(0, r)}…${n.slice(-r)}`;
}
function Ax(n) {
  const r = n.replace(/-/g, '+').replace(/_/g, '/'),
    u = (4 - (r.length % 4)) % 4;
  return atob(`${r}${'='.repeat(u)}`);
}
function wx(n) {
  const [, r] = n.split('.');
  if (!r) return null;
  try {
    return Tx(JSON.parse(Ax(r)));
  } catch {
    return null;
  }
}
function jx(n) {
  const r = wx(n);
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
function Nx() {
  const { config: n, sdk: r, session: u } = nl(),
    [c, f] = A.useState(null),
    [d, h] = A.useState(!1),
    [v, p] = A.useState(''),
    [b, S] = A.useState(''),
    x = A.useRef(0),
    [C, Z] = A.useState({ passkey: !1, ed25519: !1 }),
    G = A.useRef({ passkey: !1, ed25519: !1 }),
    [V, U] = A.useState(''),
    [B, ne] = A.useState(''),
    [ae, te] = A.useState(null);
  A.useEffect(() => {
    te(null);
  }, [u.accessToken]);
  const le =
      n.status === 'ready' &&
      !!r &&
      u.authenticated &&
      typeof u.accessToken == 'string' &&
      u.accessToken.length > 0,
    W = typeof u.accessToken == 'string' ? u.accessToken : '',
    $ = ae ?? W,
    X = le ? jx($) : 'not-manageable',
    ye = X === 'manageable',
    Ye = A.useCallback(
      async (P) => {
        const R = x.current + 1;
        if (((x.current = R), !le || !r || n.status !== 'ready')) {
          (f(null), p(''), S(''), h(!1));
          return;
        }
        (h(!0), p(''), (P != null && P.warningMessage) || S(''));
        try {
          const q = await r.me.fetch();
          if (x.current !== R) return;
          (f(q), S(''));
        } catch (q) {
          if (x.current !== R) return;
          if (P != null && P.warningMessage) {
            S(P.warningMessage);
            return;
          }
          (f(null),
            p(
              q instanceof Error
                ? q.message
                : 'Unable to load current account.',
            ));
        } finally {
          x.current === R && h(!1);
        }
      },
      [le, n.status, r, u.sessionId],
    );
  (A.useEffect(() => {
    Ye();
  }, [Ye]),
    A.useEffect(() => {
      if (!le || !r || X !== 'legacy-token' || !u.refreshToken || ae) return;
      let P = !1;
      return (
        r.session
          .refresh()
          .then((R) => {
            !P && typeof R.accessToken == 'string' && te(R.accessToken);
          })
          .catch(() => {}),
        () => {
          P = !0;
        }
      );
    }, [ae, le, X, r, u.refreshToken]));
  const Re = (c == null ? void 0 : c.email) ?? '',
    be = (c == null ? void 0 : c.webauthn_credentials) ?? [],
    Ue = (c == null ? void 0 : c.ed25519_credentials) ?? [];
  async function ze(P) {
    if (!ye || !r || G.current[P.section] || !window.confirm(P.confirmMessage))
      return;
    const R = P.section === 'passkey' ? U : ne;
    ((G.current[P.section] = !0), Z((q) => ({ ...q, [P.section]: !0 })), R(''));
    try {
      const q = await fetch(new URL(P.path, n.resolvedServerBaseUrl), {
        method: 'DELETE',
        headers: { authorization: `Bearer ${$}` },
      });
      if (!q.ok) throw new Error(`Delete failed with status ${q.status}`);
      await Ye({
        warningMessage:
          'Credential deleted, but current account data could not be refreshed.',
      });
    } catch (q) {
      R(q instanceof Error ? q.message : 'Delete failed');
    } finally {
      ((G.current[P.section] = !1), Z((q) => ({ ...q, [P.section]: !1 })));
    }
  }
  return m.jsx(vn, {
    title: 'Credentials',
    description:
      'Inspect the current account credentials and remove bound authenticators when needed.',
    children: m.jsxs('div', {
      className: 'space-y-6',
      children: [
        d
          ? m.jsx('p', {
              className: 'text-sm text-slate-600',
              children: 'Loading current account…',
            })
          : null,
        v
          ? m.jsx('p', { className: 'text-sm text-rose-600', children: v })
          : null,
        b
          ? m.jsx('p', { className: 'text-sm text-amber-700', children: b })
          : null,
        m.jsxs('section', {
          'aria-labelledby': 'credentials-email-heading',
          className:
            'space-y-3 rounded-xl border border-slate-200 bg-white p-4',
          children: [
            m.jsx('h2', {
              id: 'credentials-email-heading',
              className: 'text-sm font-semibold text-slate-950',
              children: 'Email',
            }),
            m.jsx('p', {
              className: 'text-sm text-slate-600',
              children: 'Managed via email OTP sign-in',
            }),
            le
              ? v
                ? null
                : Re
                  ? m.jsx('div', {
                      className: 'overflow-x-auto',
                      children: m.jsxs('table', {
                        className:
                          'min-w-full text-left text-sm text-slate-700',
                        children: [
                          m.jsx('thead', {
                            children: m.jsxs('tr', {
                              className:
                                'border-b border-slate-200 text-slate-500',
                              children: [
                                m.jsx('th', {
                                  className: 'py-2 pr-4 font-medium',
                                  children: 'Email',
                                }),
                                m.jsx('th', {
                                  className: 'py-2 pr-4 font-medium',
                                  children: 'Type',
                                }),
                                m.jsx('th', {
                                  className: 'py-2 font-medium',
                                  children: 'Status',
                                }),
                              ],
                            }),
                          }),
                          m.jsx('tbody', {
                            children: m.jsxs('tr', {
                              className:
                                'border-b border-slate-100 last:border-0',
                              children: [
                                m.jsx('td', {
                                  className: 'py-3 pr-4',
                                  children: Re,
                                }),
                                m.jsx('td', {
                                  className: 'py-3 pr-4',
                                  children: 'Primary email',
                                }),
                                m.jsx('td', {
                                  className: 'py-3',
                                  children: 'Read-only',
                                }),
                              ],
                            }),
                          }),
                        ],
                      }),
                    })
                  : m.jsx('p', {
                      className: 'text-sm text-slate-600',
                      children:
                        'This account does not currently have a bound email.',
                    })
              : m.jsx('p', {
                  className: 'text-sm text-slate-600',
                  children: 'Sign in to inspect the current account email.',
                }),
          ],
        }),
        m.jsxs('section', {
          'aria-labelledby': 'credentials-passkey-heading',
          className:
            'space-y-3 rounded-xl border border-slate-200 bg-white p-4',
          children: [
            m.jsx('h2', {
              id: 'credentials-passkey-heading',
              className: 'text-sm font-semibold text-slate-950',
              children: 'Passkey',
            }),
            m.jsx('p', {
              className: 'text-sm text-slate-600',
              children: 'Review the passkeys currently bound to this account.',
            }),
            V
              ? m.jsx('p', { className: 'text-sm text-rose-600', children: V })
              : null,
            le
              ? v
                ? null
                : be.length > 0
                  ? m.jsx('div', {
                      className: 'overflow-x-auto',
                      children: m.jsxs('table', {
                        className:
                          'min-w-full text-left text-sm text-slate-700',
                        children: [
                          m.jsx('thead', {
                            children: m.jsxs('tr', {
                              className:
                                'border-b border-slate-200 text-slate-500',
                              children: [
                                m.jsx('th', {
                                  className: 'py-2 pr-4 font-medium',
                                  children: 'Credential ID',
                                }),
                                m.jsx('th', {
                                  className: 'py-2 pr-4 font-medium',
                                  children: 'RP ID',
                                }),
                                m.jsx('th', {
                                  className: 'py-2 pr-4 font-medium',
                                  children: 'Last Used',
                                }),
                                m.jsx('th', {
                                  className: 'py-2 pr-4 font-medium',
                                  children: 'Created At',
                                }),
                                m.jsx('th', {
                                  className: 'py-2 font-medium',
                                  children: 'Action',
                                }),
                              ],
                            }),
                          }),
                          m.jsx('tbody', {
                            children: be.map((P) =>
                              m.jsxs(
                                'tr',
                                {
                                  className:
                                    'border-b border-slate-100 last:border-0',
                                  children: [
                                    m.jsx('td', {
                                      className: 'py-3 pr-4',
                                      title: P.credential_id,
                                      children: _h(P.credential_id),
                                    }),
                                    m.jsx('td', {
                                      className: 'py-3 pr-4',
                                      children: P.rp_id,
                                    }),
                                    m.jsx('td', {
                                      className: 'py-3 pr-4',
                                      children: P.last_used_at ?? 'Never',
                                    }),
                                    m.jsx('td', {
                                      className: 'py-3 pr-4',
                                      children: P.created_at,
                                    }),
                                    m.jsx('td', {
                                      className: 'py-3',
                                      children: ye
                                        ? m.jsx(yt, {
                                            disabled: C.passkey,
                                            'aria-label': `Delete passkey ${P.credential_id}`,
                                            onClick: () =>
                                              void ze({
                                                section: 'passkey',
                                                confirmMessage: `Delete passkey ${P.credential_id} from the current account? This cannot be undone.`,
                                                path: `/webauthn/credentials/${P.id}`,
                                              }),
                                            children: C.passkey
                                              ? 'Deleting…'
                                              : 'Delete',
                                          })
                                        : m.jsx('span', {
                                            className: 'text-slate-400',
                                            children: '—',
                                          }),
                                    }),
                                  ],
                                },
                                P.id,
                              ),
                            ),
                          }),
                        ],
                      }),
                    })
                  : m.jsx('p', {
                      className: 'text-sm text-slate-600',
                      children:
                        'No passkeys are currently bound to this account.',
                    })
              : m.jsx('p', {
                  className: 'text-sm text-slate-600',
                  children: 'Sign in to inspect current passkeys.',
                }),
          ],
        }),
        m.jsxs('section', {
          'aria-labelledby': 'credentials-ed25519-heading',
          className:
            'space-y-3 rounded-xl border border-slate-200 bg-white p-4',
          children: [
            m.jsx('h2', {
              id: 'credentials-ed25519-heading',
              className: 'text-sm font-semibold text-slate-950',
              children: 'Ed25519',
            }),
            m.jsx('p', {
              className: 'text-sm text-slate-600',
              children:
                'Review the device keys currently bound to this account.',
            }),
            B
              ? m.jsx('p', { className: 'text-sm text-rose-600', children: B })
              : null,
            le
              ? v
                ? null
                : Ue.length > 0
                  ? m.jsx('div', {
                      className: 'overflow-x-auto',
                      children: m.jsxs('table', {
                        className:
                          'min-w-full text-left text-sm text-slate-700',
                        children: [
                          m.jsx('thead', {
                            children: m.jsxs('tr', {
                              className:
                                'border-b border-slate-200 text-slate-500',
                              children: [
                                m.jsx('th', {
                                  className: 'py-2 pr-4 font-medium',
                                  children: 'Name',
                                }),
                                m.jsx('th', {
                                  className: 'py-2 pr-4 font-medium',
                                  children: 'Public Key',
                                }),
                                m.jsx('th', {
                                  className: 'py-2 pr-4 font-medium',
                                  children: 'Last Used',
                                }),
                                m.jsx('th', {
                                  className: 'py-2 pr-4 font-medium',
                                  children: 'Created At',
                                }),
                                ye
                                  ? m.jsx('th', {
                                      className: 'py-2 font-medium',
                                      children: 'Action',
                                    })
                                  : null,
                              ],
                            }),
                          }),
                          m.jsx('tbody', {
                            children: Ue.map((P) =>
                              m.jsxs(
                                'tr',
                                {
                                  className:
                                    'border-b border-slate-100 last:border-0',
                                  children: [
                                    m.jsx('td', {
                                      className: 'py-3 pr-4',
                                      children: P.name,
                                    }),
                                    m.jsx('td', {
                                      className: 'py-3 pr-4',
                                      title: P.public_key,
                                      children: _h(P.public_key),
                                    }),
                                    m.jsx('td', {
                                      className: 'py-3 pr-4',
                                      children: P.last_used_at ?? 'Never',
                                    }),
                                    m.jsx('td', {
                                      className: 'py-3 pr-4',
                                      children: P.created_at,
                                    }),
                                    ye
                                      ? m.jsx('td', {
                                          className: 'py-3',
                                          children: m.jsx(yt, {
                                            disabled: C.ed25519,
                                            'aria-label': `Delete device key ${P.name}`,
                                            onClick: () =>
                                              void ze({
                                                section: 'ed25519',
                                                confirmMessage: `Delete Ed25519 credential ${P.name} from the current account? This cannot be undone.`,
                                                path: `/ed25519/credentials/${P.id}`,
                                              }),
                                            children: C.ed25519
                                              ? 'Deleting…'
                                              : 'Delete',
                                          }),
                                        })
                                      : null,
                                  ],
                                },
                                P.id,
                              ),
                            ),
                          }),
                        ],
                      }),
                    })
                  : m.jsx('p', {
                      className: 'text-sm text-slate-600',
                      children:
                        'No Ed25519 credentials are currently bound to this account.',
                    })
              : m.jsx('p', {
                  className: 'text-sm text-slate-600',
                  children: 'Sign in to inspect current Ed25519 credentials.',
                }),
          ],
        }),
      ],
    }),
  });
}
function la({ title: n, value: r }) {
  return m.jsxs('section', {
    className:
      'rounded-lg border border-slate-200 bg-slate-950 px-4 py-3 text-slate-100 shadow-sm',
    children: [
      m.jsx('h3', {
        className:
          'mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-300',
        children: n,
      }),
      m.jsx('pre', {
        className:
          'overflow-x-auto whitespace-pre-wrap break-words text-xs leading-5',
        children: JSON.stringify(r, null, 2),
      }),
    ],
  });
}
const rt = A.forwardRef(({ className: n, ...r }, u) =>
  m.jsx('input', {
    ref: u,
    className: Dt(
      'flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 shadow-sm outline-none ring-offset-background placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-slate-950',
      n,
    ),
    ...r,
  }),
);
rt.displayName = 'Input';
function Rx() {
  const { config: n, sdk: r, session: u } = nl(),
    [c, f] = A.useState(''),
    [d, h] = A.useState(''),
    [v, p] = A.useState(null),
    [b, S] = A.useState(null),
    [x, C] = A.useState(''),
    Z = n.status === 'ready' && !!r;
  async function G(U) {
    if ((U.preventDefault(), !!r)) {
      (p('start'), C(''));
      try {
        const B = await r.email.start({ email: c.trim() });
        S(B);
      } catch (B) {
        C(B instanceof Error ? B.message : 'Email start failed');
      } finally {
        p(null);
      }
    }
  }
  async function V(U) {
    if ((U.preventDefault(), !!r)) {
      (p('verify'), C(''));
      try {
        const B = await r.email.verify({ email: c.trim(), code: d.trim() });
        S(B);
      } catch (B) {
        C(B instanceof Error ? B.message : 'OTP verification failed');
      } finally {
        p(null);
      }
    }
  }
  return m.jsx(vn, {
    title: 'Email',
    description:
      'Start an email OTP challenge, then verify it against the shared browser SDK state.',
    children: m.jsxs('div', {
      className: 'space-y-6',
      children: [
        m.jsxs('label', {
          className: 'grid gap-2 text-sm font-medium text-slate-700',
          children: [
            m.jsx('span', { children: 'Email address' }),
            m.jsx(rt, {
              'aria-label': 'Email address',
              value: c,
              onChange: (U) => f(U.currentTarget.value),
              placeholder: 'user@example.com',
            }),
          ],
        }),
        m.jsxs('form', {
          className: 'space-y-3',
          onSubmit: G,
          children: [
            m.jsx('div', {
              className: 'text-sm text-slate-600',
              children:
                'Request an OTP email using the current auth-mini server.',
            }),
            m.jsx(yt, {
              type: 'submit',
              disabled: !Z || v !== null || c.trim() === '',
              children: v === 'start' ? 'Starting…' : 'Start email sign-in',
            }),
          ],
        }),
        m.jsxs('form', {
          className: 'space-y-3',
          onSubmit: V,
          children: [
            m.jsxs('label', {
              className: 'grid gap-2 text-sm font-medium text-slate-700',
              children: [
                m.jsx('span', { children: 'One-time code' }),
                m.jsx(rt, {
                  'aria-label': 'One-time code',
                  value: d,
                  onChange: (U) => h(U.currentTarget.value),
                  placeholder: '123456',
                }),
              ],
            }),
            m.jsx(yt, {
              type: 'submit',
              disabled: !Z || v !== null || c.trim() === '' || d.trim() === '',
              children: v === 'verify' ? 'Verifying…' : 'Verify OTP',
            }),
          ],
        }),
        x
          ? m.jsx('p', { className: 'text-sm text-rose-600', children: x })
          : null,
        m.jsx(la, { title: 'session', value: u }),
        m.jsx(la, { title: 'last response', value: b }),
      ],
    }),
  });
}
/*! noble-ed25519 - MIT License (c) 2019 Paul Miller (paulmillr.com) */ const Oy =
    {
      p: 0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffedn,
      n: 0x1000000000000000000000000000000014def9dea2f79cd65812631a5cf5d3edn,
      h: 8n,
      a: 0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffecn,
      d: 0x52036cee2b6ffe738cc740797779e89800700a4d4141d8ab75eb4dca135978a3n,
      Gx: 0x216936d3cd6e53fec0a4e231fdd6dc5c692cc7609525a7b2c9562d608f25d51an,
      Gy: 0x6666666666666666666666666666666666666666666666666666666666666658n,
    },
  { p: Fs, n: Ks, Gx: Ch, Gy: Oh, a: _c, d: Cc, h: zx } = Oy,
  My = 32,
  _x = (...n) => {
    'captureStackTrace' in Error &&
      typeof Error.captureStackTrace == 'function' &&
      Error.captureStackTrace(...n);
  },
  ut = (n = '') => {
    const r = new Error(n);
    throw (_x(r, ut), r);
  },
  Cx = (n) => typeof n == 'bigint',
  Ox = (n) => typeof n == 'string',
  Mx = (n) =>
    n instanceof Uint8Array ||
    (ArrayBuffer.isView(n) && n.constructor.name === 'Uint8Array'),
  Cl = (n, r, u = '') => {
    const c = Mx(n),
      f = n == null ? void 0 : n.length,
      d = r !== void 0;
    if (!c || (d && f !== r)) {
      const h = u && `"${u}" `,
        v = d ? ` of length ${r}` : '',
        p = c ? `length=${f}` : `type=${typeof n}`;
      ut(h + 'expected Uint8Array' + v + ', got ' + p);
    }
    return n;
  },
  Ic = (n) => new Uint8Array(n),
  Dy = (n) => Uint8Array.from(n),
  Uy = (n, r) => n.toString(16).padStart(r, '0'),
  ky = (n) =>
    Array.from(Cl(n))
      .map((r) => Uy(r, 2))
      .join(''),
  wa = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 },
  Mh = (n) => {
    if (n >= wa._0 && n <= wa._9) return n - wa._0;
    if (n >= wa.A && n <= wa.F) return n - (wa.A - 10);
    if (n >= wa.a && n <= wa.f) return n - (wa.a - 10);
  },
  By = (n) => {
    const r = 'hex invalid';
    if (!Ox(n)) return ut(r);
    const u = n.length,
      c = u / 2;
    if (u % 2) return ut(r);
    const f = Ic(c);
    for (let d = 0, h = 0; d < c; d++, h += 2) {
      const v = Mh(n.charCodeAt(h)),
        p = Mh(n.charCodeAt(h + 1));
      if (v === void 0 || p === void 0) return ut(r);
      f[d] = v * 16 + p;
    }
    return f;
  },
  Dx = () => (globalThis == null ? void 0 : globalThis.crypto),
  Ux = () => {
    var n;
    return (
      ((n = Dx()) == null ? void 0 : n.subtle) ??
      ut('crypto.subtle must be defined, consider polyfill')
    );
  },
  Is = (...n) => {
    const r = Ic(n.reduce((c, f) => c + Cl(f).length, 0));
    let u = 0;
    return (
      n.forEach((c) => {
        (r.set(c, u), (u += c.length));
      }),
      r
    );
  },
  Ps = BigInt,
  jl = (n, r, u, c = 'bad number: out of range') =>
    Cx(n) && r <= n && n < u ? n : ut(c),
  Ve = (n, r = Fs) => {
    const u = n % r;
    return u >= 0n ? u : r + u;
  },
  Dh = (1n << 255n) - 1n,
  ue = (n) => {
    n < 0n && ut('negative coordinate');
    let r = (n >> 255n) * 19n + (n & Dh);
    return ((r = (r >> 255n) * 19n + (r & Dh)), r % Fs);
  },
  Hy = (n) => Ve(n, Ks),
  kx = (n, r) => {
    (n === 0n || r <= 0n) && ut('no inverse n=' + n + ' mod=' + r);
    let u = Ve(n, r),
      c = r,
      f = 0n,
      d = 1n;
    for (; u !== 0n; ) {
      const h = c / u,
        v = c % u,
        p = f - d * h;
      ((c = u), (u = v), (f = d), (d = p));
    }
    return c === 1n ? Ve(f, r) : ut('no inverse');
  },
  Oc = (n) => (n instanceof Nl ? n : ut('Point expected')),
  Hc = 2n ** 256n,
  ta = class ta {
    constructor(r, u, c, f) {
      el(this, 'X');
      el(this, 'Y');
      el(this, 'Z');
      el(this, 'T');
      const d = Hc;
      ((this.X = jl(r, 0n, d)),
        (this.Y = jl(u, 0n, d)),
        (this.Z = jl(c, 1n, d)),
        (this.T = jl(f, 0n, d)),
        Object.freeze(this));
    }
    static CURVE() {
      return Oy;
    }
    static fromAffine(r) {
      return new ta(r.x, r.y, 1n, ue(r.x * r.y));
    }
    static fromBytes(r, u = !1) {
      const c = Cc,
        f = Dy(Cl(r, My)),
        d = r[31];
      f[31] = d & -129;
      const h = Ly(f);
      jl(h, 0n, u ? Hc : Fs);
      const p = ue(h * h),
        b = Ve(p - 1n),
        S = ue(c * p + 1n);
      let { isValid: x, value: C } = Hx(b, S);
      x || ut('bad point: y not sqrt');
      const Z = (C & 1n) === 1n,
        G = (d & 128) !== 0;
      return (
        !u && C === 0n && G && ut('bad point: x==0, isLastByteOdd'),
        G !== Z && (C = Ve(-C)),
        new ta(C, h, 1n, ue(C * h))
      );
    }
    static fromHex(r, u) {
      return ta.fromBytes(By(r), u);
    }
    get x() {
      return this.toAffine().x;
    }
    get y() {
      return this.toAffine().y;
    }
    assertValidity() {
      const r = _c,
        u = Cc,
        c = this;
      if (c.is0()) return ut('bad point: ZERO');
      const { X: f, Y: d, Z: h, T: v } = c,
        p = ue(f * f),
        b = ue(d * d),
        S = ue(h * h),
        x = ue(S * S),
        C = ue(p * r),
        Z = ue(S * (C + b)),
        G = Ve(x + ue(u * ue(p * b)));
      if (Z !== G) return ut('bad point: equation left != right (1)');
      const V = ue(f * d),
        U = ue(h * v);
      return V !== U ? ut('bad point: equation left != right (2)') : this;
    }
    equals(r) {
      const { X: u, Y: c, Z: f } = this,
        { X: d, Y: h, Z: v } = Oc(r),
        p = ue(u * v),
        b = ue(d * f),
        S = ue(c * v),
        x = ue(h * f);
      return p === b && S === x;
    }
    is0() {
      return this.equals(gn);
    }
    negate() {
      return new ta(Ve(-this.X), this.Y, this.Z, Ve(-this.T));
    }
    double() {
      const { X: r, Y: u, Z: c } = this,
        f = _c,
        d = ue(r * r),
        h = ue(u * u),
        v = ue(2n * c * c),
        p = ue(f * d),
        b = Ve(r + u),
        S = Ve(ue(b * b) - d - h),
        x = Ve(p + h),
        C = Ve(x - v),
        Z = Ve(p - h),
        G = ue(S * C),
        V = ue(x * Z),
        U = ue(S * Z),
        B = ue(C * x);
      return new ta(G, V, B, U);
    }
    add(r) {
      const { X: u, Y: c, Z: f, T: d } = this,
        { X: h, Y: v, Z: p, T: b } = Oc(r),
        S = _c,
        x = Cc,
        C = ue(u * h),
        Z = ue(c * v),
        G = ue(ue(d * x) * b),
        V = ue(f * p),
        U = Ve(ue(Ve(u + c) * Ve(h + v)) - C - Z),
        B = Ve(V - G),
        ne = Ve(V + G),
        ae = Ve(Z - ue(S * C)),
        te = ue(U * B),
        le = ue(ne * ae),
        W = ue(U * ae),
        $ = ue(B * ne);
      return new ta(te, le, $, W);
    }
    subtract(r) {
      return this.add(Oc(r).negate());
    }
    multiply(r, u = !0) {
      if (!u && (r === 0n || this.is0())) return gn;
      if ((jl(r, 1n, Ks), r === 1n)) return this;
      if (this.equals(Rl)) return Vx(r).p;
      let c = gn,
        f = Rl;
      for (let d = this; r > 0n; d = d.double(), r >>= 1n)
        r & 1n ? (c = c.add(d)) : u && (f = f.add(d));
      return c;
    }
    multiplyUnsafe(r) {
      return this.multiply(r, !1);
    }
    toAffine() {
      const { X: r, Y: u, Z: c } = this;
      if (this.equals(gn)) return { x: 0n, y: 1n };
      const f = kx(c, Fs);
      ue(c * f) !== 1n && ut('invalid inverse');
      const d = ue(r * f),
        h = ue(u * f);
      return { x: d, y: h };
    }
    toBytes() {
      const { x: r, y: u } = this.toAffine(),
        c = qy(u);
      return ((c[31] |= r & 1n ? 128 : 0), c);
    }
    toHex() {
      return ky(this.toBytes());
    }
    clearCofactor() {
      return this.multiply(Ps(zx), !1);
    }
    isSmallOrder() {
      return this.clearCofactor().is0();
    }
    isTorsionFree() {
      let r = this.multiply(Ks / 2n, !1).double();
      return (Ks % 2n && (r = r.add(this)), r.is0());
    }
  };
(el(ta, 'BASE'), el(ta, 'ZERO'));
let Nl = ta;
const Rl = new Nl(Ch, Oh, 1n, Ve(Ch * Oh)),
  gn = new Nl(0n, 1n, 1n, 0n);
Nl.BASE = Rl;
Nl.ZERO = gn;
const qy = (n) => By(Uy(jl(n, 0n, Hc), 64)).reverse(),
  Ly = (n) => Ps('0x' + ky(Dy(Cl(n)).reverse())),
  ea = (n, r) => {
    let u = n;
    for (; r-- > 0n; ) u = ue(u * u);
    return u;
  },
  Bx = (n) => {
    const r = ue(n * n),
      u = ue(r * n),
      c = ue(ea(u, 2n) * u),
      f = ue(ea(c, 1n) * n),
      d = ue(ea(f, 5n) * f),
      h = ue(ea(d, 10n) * d),
      v = ue(ea(h, 20n) * h),
      p = ue(ea(v, 40n) * v),
      b = ue(ea(p, 80n) * p),
      S = ue(ea(b, 80n) * p),
      x = ue(ea(S, 10n) * d);
    return { pow_p_5_8: ue(ea(x, 2n) * n), b2: u };
  },
  Uh = 0x2b8324804fc1df0b2b4d00993dfbd7a72f431806ad2fe478c4ee1b274a0ea0b0n,
  Hx = (n, r) => {
    const u = ue(r * ue(r * r)),
      c = ue(ue(u * u) * r),
      f = Bx(ue(n * c)).pow_p_5_8;
    let d = ue(n * ue(u * f));
    const h = ue(r * ue(d * d)),
      v = d,
      p = ue(d * Uh),
      b = h === n,
      S = h === Ve(-n),
      x = h === Ve(-n * Uh);
    return (
      b && (d = v),
      (S || x) && (d = p),
      (Ve(d) & 1n) === 1n && (d = Ve(-d)),
      { isValid: b || S, value: d }
    );
  },
  qc = (n) => Hy(Ly(n)),
  Pc = (...n) => Xy.sha512Async(Is(...n)),
  qx = (n) => {
    const r = n.slice(0, 32);
    ((r[0] &= 248), (r[31] &= 127), (r[31] |= 64));
    const u = n.slice(32, 64),
      c = qc(r),
      f = Rl.multiply(c),
      d = f.toBytes();
    return { head: r, prefix: u, scalar: c, point: f, pointBytes: d };
  },
  Yy = (n) => Pc(Cl(n, My)).then(qx),
  Gy = (n) => Yy(n).then((r) => r.pointBytes),
  Lx = (n) => Pc(n.hashable).then(n.finish),
  Yx = (n, r, u) => {
    const { pointBytes: c, scalar: f } = n,
      d = qc(r),
      h = Rl.multiply(d).toBytes();
    return {
      hashable: Is(h, c, u),
      finish: (b) => {
        const S = Hy(d + qc(b) * f);
        return Cl(Is(h, qy(S)), 64);
      },
    };
  },
  Gx = async (n, r) => {
    const u = Cl(n),
      c = await Yy(r),
      f = await Pc(c.prefix, u);
    return Lx(Yx(c, f, u));
  },
  Xy = {
    sha512Async: async (n) => {
      const r = Ux(),
        u = Is(n);
      return Ic(await r.digest('SHA-512', u.buffer));
    },
    sha512: void 0,
  },
  er = 8,
  Xx = 256,
  Zy = Math.ceil(Xx / er) + 1,
  Lc = 2 ** (er - 1),
  Zx = () => {
    const n = [];
    let r = Rl,
      u = r;
    for (let c = 0; c < Zy; c++) {
      ((u = r), n.push(u));
      for (let f = 1; f < Lc; f++) ((u = u.add(r)), n.push(u));
      r = u.double();
    }
    return n;
  };
let kh;
const Bh = (n, r) => {
    const u = r.negate();
    return n ? u : r;
  },
  Vx = (n) => {
    const r = kh || (kh = Zx());
    let u = gn,
      c = Rl;
    const f = 2 ** er,
      d = f,
      h = Ps(f - 1),
      v = Ps(er);
    for (let p = 0; p < Zy; p++) {
      let b = Number(n & h);
      ((n >>= v), b > Lc && ((b -= d), (n += 1n)));
      const S = p * Lc,
        x = S,
        C = S + Math.abs(b) - 1,
        Z = p % 2 !== 0,
        G = b < 0;
      b === 0 ? (c = c.add(Bh(Z, r[x]))) : (u = u.add(Bh(G, r[C])));
    }
    return (n !== 0n && ut('invalid wnaf'), { p: u, f: c });
  },
  gi = 'Expected base64url-encoded 32-byte value';
Xy.sha512Async = async (n) => {
  const r = await crypto.subtle.digest('SHA-512', Uint8Array.from(n));
  return new Uint8Array(r);
};
function tr(n) {
  let r = '';
  for (const u of n) r += String.fromCharCode(u);
  return btoa(r).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
function eo(n) {
  const r = n.trim();
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
function Hh(n) {
  if (n.trim() === '') return gi;
  try {
    return (eo(n), '');
  } catch (r) {
    return r instanceof Error ? r.message : gi;
  }
}
async function Qx(n) {
  const r = await Gy(eo(n));
  return tr(r);
}
async function Kx(n, r) {
  const u = await Gx(new TextEncoder().encode(r), eo(n));
  return tr(u);
}
async function Vy() {
  const n = crypto.getRandomValues(new Uint8Array(32)),
    r = await Gy(n);
  return { seed: tr(n), publicKey: tr(r) };
}
function Jx() {
  const { adoptDemoSession: n, config: r, sdk: u, session: c } = nl(),
    [f, d] = A.useState(''),
    [h, v] = A.useState(''),
    [p, b] = A.useState(''),
    [S, x] = A.useState(''),
    [C, Z] = A.useState(''),
    [G, V] = A.useState(''),
    [U, B] = A.useState(''),
    [ne, ae] = A.useState(''),
    [te, le] = A.useState(null),
    [W, $] = A.useState(''),
    [X, ye] = A.useState(''),
    [Ye, Re] = A.useState({ register: null, signIn: null }),
    [be, Ue] = A.useState(null),
    [ze, P] = A.useState(!1),
    [R, q] = A.useState(''),
    [se, ee] = A.useState(''),
    J = A.useRef(0),
    w = r.status === 'ready' && !!u,
    g = c.authenticated && typeof c.accessToken == 'string',
    T = h.trim() === '' ? '' : Hh(h),
    M = Hh(S),
    Q = S.trim() === '' ? '' : M,
    K = w && g && f.trim() !== '' && h.trim() !== '' && T === '' && te === null,
    I = w && p.trim() !== '' && M === '' && te === null,
    fe = A.useCallback(
      async (pe) => {
        const me = J.current + 1;
        if (
          ((J.current = me), !u || r.status !== 'ready' || !c.authenticated)
        ) {
          (Ue(null), q(''), ee(''), P(!1));
          return;
        }
        (P(!0), q(''), (pe != null && pe.warningMessage) || ee(''));
        try {
          const Le = await u.me.fetch();
          if (J.current !== me) return;
          (Ue(Le), ee(''));
        } catch (Le) {
          if (J.current !== me) return;
          if (pe != null && pe.warningMessage) {
            ee(pe.warningMessage);
            return;
          }
          (Ue(null),
            q(
              Le instanceof Error
                ? Le.message
                : 'Unable to load current credentials.',
            ));
        } finally {
          J.current === me && P(!1);
        }
      },
      [r.status, u, c.authenticated, c.sessionId],
    );
  A.useEffect(() => {
    fe();
  }, [fe]);
  function L(pe) {
    return pe instanceof Error
      ? pe.message
      : typeof pe == 'object' && pe !== null
        ? JSON.stringify(pe)
        : String(pe);
  }
  async function F() {
    (le('generate'), $(''));
    try {
      const pe = await Vy();
      (V(pe.seed),
        B(pe.publicKey),
        v(pe.publicKey),
        x(pe.seed),
        Z(pe.publicKey));
    } catch (pe) {
      $(L(pe));
    } finally {
      le(null);
    }
  }
  async function Se(pe) {
    if ((pe.preventDefault(), !(!u || !I))) {
      (le('signin'), ye(''));
      try {
        const me = S.trim(),
          Le = await Qx(me);
        Z(Le);
        const ia = await u.ed25519.start({ credential_id: p.trim() }),
          il = await Kx(me, ia.challenge),
          sl = await u.ed25519.verify({
            request_id: ia.request_id,
            signature: il,
          });
        (Re((xn) => ({ ...xn, signIn: sl })), await n(sl));
      } catch (me) {
        (ye(L(me)), Re((Le) => ({ ...Le, signIn: me })));
      } finally {
        le(null);
      }
    }
  }
  async function Ke(pe) {
    if ((pe.preventDefault(), !(!u || !K))) {
      (le('register'), $(''));
      try {
        const me = await u.ed25519.register({
          name: f.trim(),
          public_key: h.trim(),
        });
        (await fe({
          warningMessage:
            'Credential registered, but current credential data could not be refreshed.',
        }),
          Re((Le) => ({ ...Le, register: me })),
          ae(typeof me.id == 'string' ? me.id : ''));
      } catch (me) {
        ($(L(me)), Re((Le) => ({ ...Le, register: me })));
      } finally {
        le(null);
      }
    }
  }
  return m.jsx(vn, {
    title: 'ED25519',
    description:
      'Generate a temporary Ed25519 keypair, register a credential for the current user, or sign in by signing the server challenge in the browser.',
    children: m.jsxs('div', {
      className: 'space-y-6',
      children: [
        m.jsxs('section', {
          className: 'space-y-4',
          children: [
            m.jsx('h2', {
              className: 'text-lg font-semibold',
              children: 'Register a credential',
            }),
            m.jsxs('form', {
              className: 'space-y-4',
              onSubmit: Ke,
              children: [
                m.jsxs('label', {
                  className: 'grid gap-2 text-sm font-medium text-slate-700',
                  children: [
                    m.jsx('span', { children: 'Credential name' }),
                    m.jsx(rt, {
                      'aria-label': 'Credential name',
                      value: f,
                      onChange: (pe) => d(pe.currentTarget.value),
                      placeholder: 'Laptop signer',
                    }),
                  ],
                }),
                m.jsxs('label', {
                  className: 'grid gap-2 text-sm font-medium text-slate-700',
                  children: [
                    m.jsx('span', {
                      children: 'Public key (base64url 32-byte)',
                    }),
                    m.jsx(rt, {
                      'aria-label': 'Public key (base64url 32-byte)',
                      value: h,
                      onChange: (pe) => v(pe.currentTarget.value),
                      placeholder:
                        'jt2HpVJxALeSteTe7QlqBRiOxVeloHMMImehYhZc9Rg',
                    }),
                  ],
                }),
                T
                  ? m.jsx('p', {
                      className: 'text-sm text-rose-600',
                      children: T,
                    })
                  : null,
                g
                  ? null
                  : m.jsx('p', {
                      className: 'text-sm text-slate-600',
                      children:
                        'Registering an ED25519 credential requires an existing session.',
                    }),
                m.jsxs('div', {
                  className: 'flex flex-wrap gap-3',
                  children: [
                    m.jsx(yt, {
                      type: 'button',
                      disabled: te !== null,
                      onClick: F,
                      children:
                        te === 'generate'
                          ? 'Generating…'
                          : 'Generate temporary keypair',
                    }),
                    m.jsx(yt, {
                      type: 'submit',
                      disabled: !K,
                      children:
                        te === 'register'
                          ? 'Registering…'
                          : 'Register credential',
                    }),
                  ],
                }),
              ],
            }),
            m.jsxs('div', {
              className:
                'grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 md:grid-cols-2',
              children: [
                m.jsxs('div', {
                  className: 'space-y-1',
                  children: [
                    m.jsx('div', {
                      className: 'font-medium text-slate-950',
                      children: 'Generated seed',
                    }),
                    m.jsx('div', {
                      className: 'break-all font-mono text-xs',
                      children: G || 'None generated yet.',
                    }),
                  ],
                }),
                m.jsxs('div', {
                  className: 'space-y-1',
                  children: [
                    m.jsx('div', {
                      className: 'font-medium text-slate-950',
                      children: 'Generated public key',
                    }),
                    m.jsx('div', {
                      className: 'break-all font-mono text-xs',
                      children: U || 'None generated yet.',
                    }),
                  ],
                }),
                m.jsxs('div', {
                  className: 'space-y-1 md:col-span-2',
                  children: [
                    m.jsx('div', {
                      className: 'font-medium text-slate-950',
                      children: 'Last registered credential id',
                    }),
                    m.jsx('div', {
                      className: 'break-all font-mono text-xs',
                      children: ne || 'No credential registered yet.',
                    }),
                  ],
                }),
              ],
            }),
            W
              ? m.jsx('p', { className: 'text-sm text-rose-600', children: W })
              : null,
          ],
        }),
        m.jsxs('section', {
          className: 'space-y-4',
          children: [
            m.jsx('h2', {
              className: 'text-lg font-semibold',
              children: 'Sign in with private key',
            }),
            w
              ? null
              : m.jsx('p', {
                  className: 'text-sm text-slate-600',
                  children: 'Complete setup before using ED25519 actions.',
                }),
            m.jsxs('form', {
              className: 'space-y-4',
              onSubmit: Se,
              children: [
                m.jsxs('label', {
                  className: 'grid gap-2 text-sm font-medium text-slate-700',
                  children: [
                    m.jsx('span', { children: 'Credential id' }),
                    m.jsx(rt, {
                      'aria-label': 'Credential id',
                      value: p,
                      onChange: (pe) => b(pe.currentTarget.value),
                      placeholder: 'cred_123',
                    }),
                  ],
                }),
                m.jsxs('label', {
                  className: 'grid gap-2 text-sm font-medium text-slate-700',
                  children: [
                    m.jsx('span', { children: 'Seed (base64url 32-byte)' }),
                    m.jsx(rt, {
                      'aria-label': 'Seed (base64url 32-byte)',
                      value: S,
                      onChange: (pe) => x(pe.currentTarget.value),
                      placeholder:
                        '7rANewlCLceTsUo9feN0DLjnu-ayYsdhkVWvHT4FelM',
                    }),
                  ],
                }),
                Q
                  ? m.jsx('p', {
                      className: 'text-sm text-rose-600',
                      children: Q,
                    })
                  : null,
                m.jsxs('div', {
                  className: 'flex flex-wrap gap-3',
                  children: [
                    m.jsx(yt, {
                      type: 'button',
                      disabled: G === '' || te !== null,
                      onClick: () => {
                        (x(G), Z(U));
                      },
                      children: 'Use current generated seed',
                    }),
                    m.jsx(yt, {
                      type: 'button',
                      disabled: ne === '' || te !== null,
                      onClick: () => b(ne),
                      children: 'Use last registered credential id',
                    }),
                    m.jsx(yt, {
                      type: 'submit',
                      disabled: !I,
                      children:
                        te === 'signin'
                          ? 'Signing in…'
                          : 'Sign in with private key',
                    }),
                  ],
                }),
              ],
            }),
            m.jsxs('div', {
              className:
                'rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700',
              children: [
                m.jsx('div', {
                  className: 'font-medium text-slate-950',
                  children: 'Derived public key',
                }),
                m.jsx('div', {
                  className: 'mt-1 break-all font-mono text-xs',
                  children: C || 'No seed-derived public key yet.',
                }),
              ],
            }),
            X
              ? m.jsx('p', { className: 'text-sm text-rose-600', children: X })
              : null,
          ],
        }),
        m.jsxs('div', {
          className: 'grid gap-4 xl:grid-cols-3',
          children: [
            m.jsx(la, { title: 'session', value: c }),
            m.jsx(la, { title: 'last responses', value: Ye }),
            m.jsxs('div', {
              className: 'space-y-3',
              children: [
                ze
                  ? m.jsx('p', {
                      className: 'text-sm text-slate-600',
                      children: 'Loading current credentials…',
                    })
                  : null,
                R
                  ? m.jsx('p', {
                      className: 'text-sm text-rose-600',
                      children: R,
                    })
                  : null,
                se
                  ? m.jsx('p', {
                      className: 'text-sm text-amber-700',
                      children: se,
                    })
                  : null,
                m.jsx(la, {
                  title: 'current credentials',
                  value: R
                    ? null
                    : ((be == null ? void 0 : be.ed25519_credentials) ?? []),
                }),
              ],
            }),
          ],
        }),
      ],
    }),
  });
}
const $x = [
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
  Wx = [
    'Email OTP',
    'Passkey sign-in',
    'Session state',
    'JWT access + refresh tokens',
    'JWKS for backend verification',
    'Cross-origin frontend integration',
  ],
  Fx = [
    'A self-hosted auth server for browser apps and backend token verification.',
    'A smaller auth core with clear operational ownership and predictable data flow.',
    'A product that needs authentication without bundling authorization or user-management scope.',
  ],
  Ix = [
    'Authorization models such as RBAC, ACLs, roles, permissions, or groups.',
    'Social login providers or enterprise identity federation.',
    'SMS or TOTP multi-factor flows.',
    'User profiles, admin backoffice tooling, or a general user-management suite.',
  ];
function Px() {
  const { config: n } = nl();
  return m.jsxs('div', {
    className: 'space-y-8',
    children: [
      m.jsx('section', {
        className:
          'rounded-3xl border border-slate-200 bg-white px-6 py-8 shadow-sm sm:px-8',
        children: m.jsxs('div', {
          className: 'space-y-4',
          children: [
            m.jsx('p', {
              className:
                'text-sm font-semibold uppercase tracking-[0.2em] text-slate-500',
              children: 'Official auth-mini Auth Server demo',
            }),
            m.jsxs('div', {
              className: 'space-y-3',
              children: [
                m.jsx('h1', {
                  className:
                    'max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl',
                  children: 'Minimal Self-Hosted Auth Server for your Apps',
                }),
                m.jsx('p', {
                  className:
                    'max-w-3xl text-base leading-7 text-slate-600 sm:text-lg',
                  children:
                    'Run a self-hosted auth core for your apps with email OTP, passkeys, sessions, and JWKS-backed token verification while keeping service ownership and user data in your stack.',
                }),
                m.jsx('p', {
                  className: 'max-w-3xl text-sm leading-6 text-slate-500',
                  children:
                    'This is the default product overview for the official demo. Setup, Email, Passkey, and Session still exist as proof-flow pages inside the current app shell when you want to validate the implementation.',
                }),
              ],
            }),
            m.jsx('div', {
              className:
                'rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700',
              children:
                n.status === 'ready'
                  ? 'Demo setup status: ready - browser flows use the current server.'
                  : 'Demo setup status: waiting for the current server.',
            }),
          ],
        }),
      }),
      m.jsxs('section', {
        className: 'space-y-4',
        children: [
          m.jsxs('div', {
            className: 'space-y-2',
            children: [
              m.jsx('h2', {
                className: 'text-2xl font-semibold text-slate-950',
                children: 'Why teams pick auth-mini',
              }),
              m.jsx('p', {
                className: 'max-w-3xl text-sm leading-6 text-slate-600',
                children:
                  'The value proposition stays narrow on purpose: a trustworthy auth server core that covers the common sign-in and token-verification path without turning into a larger identity platform.',
              }),
            ],
          }),
          m.jsx('div', {
            className: 'grid gap-4 md:grid-cols-2',
            children: $x.map((r) =>
              m.jsx(
                Zs,
                {
                  className: 'h-full',
                  children: m.jsxs(Vs, {
                    children: [
                      m.jsx(Cy, { children: r.title }),
                      m.jsx(Qs, { children: r.description }),
                    ],
                  }),
                },
                r.title,
              ),
            ),
          }),
        ],
      }),
      m.jsx('section', {
        className:
          'rounded-3xl border border-slate-200 bg-slate-950 px-6 py-6 text-white shadow-sm',
        children: m.jsxs('div', {
          className: 'space-y-4',
          children: [
            m.jsx('h2', {
              className: 'text-2xl font-semibold',
              children: 'Auth server capabilities',
            }),
            m.jsx('p', {
              className: 'max-w-3xl text-sm leading-6 text-slate-300',
              children:
                'Scan the auth core quickly, then dive into the dedicated demo routes only when you want hands-on verification.',
            }),
            m.jsx('div', {
              className: 'flex flex-wrap gap-2',
              children: Wx.map((r) =>
                m.jsx(
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
      m.jsxs('section', {
        className: 'grid gap-4 lg:grid-cols-2',
        children: [
          m.jsxs(Zs, {
            className: 'h-full',
            children: [
              m.jsxs(Vs, {
                children: [
                  m.jsx('h3', {
                    className: 'text-lg font-semibold text-slate-950',
                    children: 'Good fit',
                  }),
                  m.jsx(Qs, {
                    children:
                      'Choose auth-mini when you want a self-hosted authentication core with clear scope and a backend-friendly verification story.',
                  }),
                ],
              }),
              m.jsx(Bc, {
                children: m.jsx('ul', {
                  className: 'space-y-3 text-sm leading-6 text-slate-600',
                  children: Fx.map((r) =>
                    m.jsxs(
                      'li',
                      {
                        className: 'flex gap-3',
                        children: [
                          m.jsx('span', {
                            className:
                              'mt-2 h-2 w-2 rounded-full bg-emerald-500',
                          }),
                          m.jsx('span', { children: r }),
                        ],
                      },
                      r,
                    ),
                  ),
                }),
              }),
            ],
          }),
          m.jsxs(Zs, {
            className: 'h-full border-amber-200 bg-amber-50/60',
            children: [
              m.jsxs(Vs, {
                children: [
                  m.jsx('h3', {
                    className: 'text-lg font-semibold text-slate-950',
                    children: 'Not included',
                  }),
                  m.jsx(Qs, {
                    children:
                      'Keep the boundary explicit so the homepage does not imply a full identity platform or broader product suite.',
                  }),
                ],
              }),
              m.jsx(Bc, {
                children: m.jsx('ul', {
                  className: 'space-y-3 text-sm leading-6 text-slate-700',
                  children: Ix.map((r) =>
                    m.jsxs(
                      'li',
                      {
                        className: 'flex gap-3',
                        children: [
                          m.jsx('span', {
                            className: 'mt-2 h-2 w-2 rounded-full bg-amber-500',
                          }),
                          m.jsx('span', { children: r }),
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
      m.jsx('section', {
        className:
          'rounded-3xl border border-slate-200 bg-white px-6 py-6 shadow-sm',
        children: m.jsxs('div', {
          className: 'space-y-4',
          children: [
            m.jsxs('div', {
              className: 'space-y-2',
              children: [
                m.jsx('h2', {
                  className: 'text-2xl font-semibold text-slate-950',
                  children: 'Validate the browser flows when you are ready',
                }),
                m.jsx('p', {
                  className: 'max-w-3xl text-sm leading-6 text-slate-600',
                  children:
                    'Use Setup to configure this auth-mini instance, then move through Email, Passkey, and Session to inspect the product in action without turning the homepage into a setup checklist.',
                }),
              ],
            }),
            m.jsxs('div', {
              className: 'flex flex-wrap gap-3',
              children: [
                m.jsx($s, {
                  to: '/setup',
                  className:
                    'inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700',
                  children: 'Start with official Auth Server setup',
                }),
                m.jsx($s, {
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
function eS() {
  const { config: n, sdk: r, session: u } = nl(),
    [c, f] = A.useState(null),
    [d, h] = A.useState(null),
    [v, p] = A.useState(''),
    [b, S] = A.useState(null),
    [x, C] = A.useState(!1),
    [Z, G] = A.useState(''),
    [V, U] = A.useState(''),
    B = A.useRef(0),
    ne = n.status === 'ready' && !!r,
    ae = ne && u.authenticated && b !== null,
    te = A.useCallback(
      async (W) => {
        const $ = B.current + 1;
        if (((B.current = $), !r || n.status !== 'ready' || !u.authenticated)) {
          (S(null), G(''), U(''), C(!1));
          return;
        }
        (C(!0), G(''), (W != null && W.warningMessage) || U(''));
        try {
          const X = await r.me.fetch();
          if (B.current !== $) return;
          (S(X), U(''));
        } catch (X) {
          if (B.current !== $) return;
          if (W != null && W.warningMessage) {
            U(W.warningMessage);
            return;
          }
          (S(null),
            G(X instanceof Error ? X.message : 'Unable to load current user.'));
        } finally {
          B.current === $ && C(!1);
        }
      },
      [n.status, r, u.authenticated, u.sessionId],
    );
  A.useEffect(() => {
    te();
  }, [te]);
  async function le(W) {
    if (!(!r || (W === 'register' && !ae))) {
      (f(W), p(''), h(null));
      try {
        const $ =
          W === 'register'
            ? await r.passkey.register()
            : await r.passkey.authenticate();
        (W === 'register' &&
          (await te({
            warningMessage:
              'Passkey registered, but current user data could not be refreshed.',
          })),
          h($));
      } catch ($) {
        p($ instanceof Error ? $.message : `Passkey ${W} failed`);
      } finally {
        f(null);
      }
    }
  }
  return m.jsx(vn, {
    title: 'Passkey',
    description:
      'Trigger passkey registration or sign-in while reusing the shared SDK and session state.',
    children: m.jsxs('div', {
      className: 'space-y-6',
      children: [
        m.jsx('p', {
          className: 'text-sm text-slate-600',
          children:
            'Use these controls once setup is connected to exercise the current SDK wiring.',
        }),
        m.jsxs('div', {
          className: 'flex flex-wrap gap-3',
          children: [
            m.jsx(yt, {
              disabled: !ae || c !== null,
              onClick: () => void le('register'),
              children: c === 'register' ? 'Registering…' : 'Register passkey',
            }),
            m.jsx(yt, {
              disabled: !ne || c !== null,
              onClick: () => void le('authenticate'),
              children:
                c === 'authenticate' ? 'Signing in…' : 'Sign in with passkey',
            }),
          ],
        }),
        ae
          ? null
          : m.jsx('p', {
              className: 'text-sm text-slate-600',
              children:
                'Register a passkey after signing in with an existing session.',
            }),
        x
          ? m.jsx('p', {
              className: 'text-sm text-slate-600',
              children: 'Loading current user…',
            })
          : null,
        Z
          ? m.jsx('p', { className: 'text-sm text-rose-600', children: Z })
          : null,
        V
          ? m.jsx('p', { className: 'text-sm text-amber-700', children: V })
          : null,
        v
          ? m.jsx('p', { className: 'text-sm text-rose-600', children: v })
          : null,
        m.jsx(la, { title: 'session', value: u }),
        m.jsx(la, { title: 'current user', value: b }),
        m.jsx(la, { title: 'last response', value: d }),
      ],
    }),
  });
}
function tS(n) {
  return typeof n == 'object' && n !== null ? n : null;
}
function aS(n) {
  const r = n.replace(/-/g, '+').replace(/_/g, '/'),
    u = (4 - (r.length % 4)) % 4;
  return atob(`${r}${'='.repeat(u)}`);
}
function lS(n) {
  const [, r] = n.split('.');
  if (!r) return null;
  try {
    return tS(JSON.parse(aS(r)));
  } catch {
    return null;
  }
}
function qh(n) {
  const r = lS(n);
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
function nS(n) {
  return n == null || n.trim() === '' ? 'Unavailable' : n;
}
function iS(n) {
  return n == null || n.trim() === ''
    ? 'Unavailable'
    : n.length > 48
      ? `${n.slice(0, 45)}...`
      : n;
}
function sS() {
  const { clearLocalAuthState: n, config: r, sdk: u, session: c } = nl(),
    [f, d] = A.useState(null),
    [h, v] = A.useState(!1),
    [p, b] = A.useState(''),
    [S, x] = A.useState(''),
    C = A.useRef(0),
    [Z, G] = A.useState(null),
    [V, U] = A.useState(''),
    B = (f == null ? void 0 : f.active_sessions) ?? [],
    ne = A.useCallback(
      async (te) => {
        const le = C.current + 1;
        if (
          ((C.current = le), !u || r.status !== 'ready' || !c.authenticated)
        ) {
          (d(null), b(''), x(''), v(!1));
          return;
        }
        (v(!0), b(''), (te != null && te.warningMessage) || x(''));
        try {
          const W = await u.me.fetch();
          if (C.current !== le) return;
          (d(W), x(''));
        } catch (W) {
          if (C.current !== le) return;
          if (te != null && te.warningMessage) {
            x(te.warningMessage);
            return;
          }
          (d(null),
            b(W instanceof Error ? W.message : 'Unable to load current user.'));
        } finally {
          C.current === le && v(!1);
        }
      },
      [r.status, u, c.authenticated, c.sessionId],
    );
  A.useEffect(() => {
    ne();
  }, [ne]);
  async function ae(te) {
    if (Z === null) {
      if (!u || !c.accessToken || r.status !== 'ready') {
        U('Unable to kick session.');
        return;
      }
      (U(''), G(te));
      try {
        let le = c.accessToken;
        if (qh(le) === 'legacy-token' && c.refreshToken) {
          const X = await u.session.refresh();
          typeof X.accessToken == 'string' && (le = X.accessToken);
        }
        if (qh(le) !== 'manageable') throw new Error('Unable to kick session.');
        if (
          !(
            await fetch(
              new URL(`/session/${te}/logout`, r.resolvedServerBaseUrl),
              { method: 'POST', headers: { authorization: `Bearer ${le}` } },
            )
          ).ok
        )
          throw new Error('Unable to kick session.');
        (await ne({
          warningMessage:
            'Session updated, but current user data could not be refreshed.',
        }),
          U(''));
      } catch {
        U('Unable to kick session.');
      } finally {
        G(null);
      }
    }
  }
  return m.jsx(vn, {
    title: 'Session',
    description:
      'Inspect the current auth snapshot and clear local state when needed.',
    children: m.jsxs('div', {
      className: 'space-y-6',
      children: [
        m.jsxs('div', {
          className:
            'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between',
          children: [
            m.jsx('p', {
              className: 'max-w-2xl text-sm text-slate-600',
              children:
                'The session page owns its own authenticated profile fetch so refreshes stay local to this route.',
            }),
            m.jsx(yt, {
              onClick: () => void n(),
              children: 'Clear local auth state',
            }),
          ],
        }),
        m.jsxs('div', {
          className: 'grid gap-4 lg:grid-cols-2',
          children: [
            m.jsx(la, {
              title: 'Current session',
              value: c ?? { status: r.status },
            }),
            m.jsx(la, { title: 'Current user', value: f }),
          ],
        }),
        h
          ? m.jsx('p', {
              className: 'text-sm text-slate-600',
              children: 'Loading current user…',
            })
          : null,
        p
          ? m.jsx('p', { className: 'text-sm text-rose-600', children: p })
          : null,
        S
          ? m.jsx('p', { className: 'text-sm text-amber-700', children: S })
          : null,
        m.jsxs('section', {
          'aria-labelledby': 'active-sessions-heading',
          className:
            'space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4',
          children: [
            m.jsxs('div', {
              className: 'space-y-1',
              children: [
                m.jsx('h3', {
                  id: 'active-sessions-heading',
                  className: 'text-base font-semibold text-slate-950',
                  children: 'Active sessions',
                }),
                m.jsx('p', {
                  className: 'text-sm text-slate-600',
                  children:
                    'Review every active session in the current snapshot and kick peers as needed.',
                }),
              ],
            }),
            V
              ? m.jsx('p', {
                  className: 'text-sm text-rose-600',
                  children: 'Unable to kick session.',
                })
              : null,
            c.authenticated
              ? p
                ? null
                : B.length === 0
                  ? m.jsx('p', {
                      className: 'text-sm text-slate-600',
                      children: 'No active sessions.',
                    })
                  : m.jsx('div', {
                      className: 'overflow-x-auto',
                      children: m.jsxs('table', {
                        className: 'min-w-full border-collapse text-sm',
                        children: [
                          m.jsx('thead', {
                            children: m.jsxs('tr', {
                              className:
                                'border-b border-slate-200 text-left text-slate-600',
                              children: [
                                m.jsx('th', {
                                  className: 'px-3 py-2 font-medium',
                                  children: 'Session ID',
                                }),
                                m.jsx('th', {
                                  className: 'px-3 py-2 font-medium',
                                  children: 'Auth Method',
                                }),
                                m.jsx('th', {
                                  className: 'px-3 py-2 font-medium',
                                  children: 'Created At',
                                }),
                                m.jsx('th', {
                                  className: 'px-3 py-2 font-medium',
                                  children: 'Expires At',
                                }),
                                m.jsx('th', {
                                  className: 'px-3 py-2 font-medium',
                                  children: 'IP',
                                }),
                                m.jsx('th', {
                                  className: 'px-3 py-2 font-medium',
                                  children: 'User-Agent',
                                }),
                                m.jsx('th', {
                                  className: 'px-3 py-2 font-medium',
                                  children: 'Action',
                                }),
                              ],
                            }),
                          }),
                          m.jsx('tbody', {
                            children: B.map((te) => {
                              const le = Z === te.id;
                              return m.jsxs(
                                'tr',
                                {
                                  className:
                                    'border-b border-slate-200 last:border-b-0',
                                  children: [
                                    m.jsx('td', {
                                      className:
                                        'px-3 py-2 font-mono text-xs text-slate-950',
                                      children: te.id,
                                    }),
                                    m.jsx('td', {
                                      className:
                                        'px-3 py-2 font-mono text-xs text-slate-950',
                                      children: te.auth_method,
                                    }),
                                    m.jsx('td', {
                                      className:
                                        'px-3 py-2 font-mono text-xs text-slate-950',
                                      children: te.created_at,
                                    }),
                                    m.jsx('td', {
                                      className:
                                        'px-3 py-2 font-mono text-xs text-slate-950',
                                      children: te.expires_at,
                                    }),
                                    m.jsx('td', {
                                      className:
                                        'px-3 py-2 font-mono text-xs text-slate-950',
                                      children: nS(te.ip),
                                    }),
                                    m.jsx('td', {
                                      className:
                                        'px-3 py-2 font-mono text-xs text-slate-950',
                                      children: iS(te.user_agent),
                                    }),
                                    m.jsx('td', {
                                      className: 'px-3 py-2',
                                      children: m.jsx(yt, {
                                        disabled: le,
                                        onClick: () => void ae(te.id),
                                        children: le ? 'Kicking...' : 'Kick',
                                      }),
                                    }),
                                  ],
                                },
                                te.id,
                              );
                            }),
                          }),
                        ],
                      }),
                    })
              : m.jsx('p', {
                  className: 'text-sm text-slate-600',
                  children: 'No active sessions.',
                }),
          ],
        }),
      ],
    }),
  });
}
const rS = {
  bodySerializer: (n) =>
    JSON.stringify(n, (r, u) => (typeof u == 'bigint' ? u.toString() : u)),
};
function uS({
  onRequest: n,
  onSseError: r,
  onSseEvent: u,
  responseTransformer: c,
  responseValidator: f,
  sseDefaultRetryDelay: d,
  sseMaxRetryAttempts: h,
  sseMaxRetryDelay: v,
  sseSleepFn: p,
  url: b,
  ...S
}) {
  let x;
  const C = p ?? ((V) => new Promise((U) => setTimeout(U, V)));
  return {
    stream: (async function* () {
      let V = d ?? 3e3,
        U = 0;
      const B = S.signal ?? new AbortController().signal;
      for (; !B.aborted; ) {
        U++;
        const ne =
          S.headers instanceof Headers ? S.headers : new Headers(S.headers);
        x !== void 0 && ne.set('Last-Event-ID', x);
        try {
          const ae = {
            redirect: 'follow',
            ...S,
            body: S.serializedBody,
            headers: ne,
            signal: B,
          };
          let te = new Request(b, ae);
          n && (te = await n(b, ae));
          const W = await (S.fetch ?? globalThis.fetch)(te);
          if (!W.ok) throw new Error(`SSE failed: ${W.status} ${W.statusText}`);
          if (!W.body) throw new Error('No body in SSE response');
          const $ = W.body.pipeThrough(new TextDecoderStream()).getReader();
          let X = '';
          const ye = () => {
            try {
              $.cancel();
            } catch {}
          };
          B.addEventListener('abort', ye);
          try {
            for (;;) {
              const { done: Ye, value: Re } = await $.read();
              if (Ye) break;
              ((X += Re),
                (X = X.replace(
                  /\r\n?/g,
                  `
`,
                )));
              const be = X.split(`

`);
              X = be.pop() ?? '';
              for (const Ue of be) {
                const ze = Ue.split(`
`),
                  P = [];
                let R;
                for (const ee of ze)
                  if (ee.startsWith('data:'))
                    P.push(ee.replace(/^data:\s*/, ''));
                  else if (ee.startsWith('event:'))
                    R = ee.replace(/^event:\s*/, '');
                  else if (ee.startsWith('id:')) x = ee.replace(/^id:\s*/, '');
                  else if (ee.startsWith('retry:')) {
                    const J = Number.parseInt(ee.replace(/^retry:\s*/, ''), 10);
                    Number.isNaN(J) || (V = J);
                  }
                let q,
                  se = !1;
                if (P.length) {
                  const ee = P.join(`
`);
                  try {
                    ((q = JSON.parse(ee)), (se = !0));
                  } catch {
                    q = ee;
                  }
                }
                (se && (f && (await f(q)), c && (q = await c(q))),
                  u == null || u({ data: q, event: R, id: x, retry: V }),
                  P.length && (yield q));
              }
            }
          } finally {
            (B.removeEventListener('abort', ye), $.releaseLock());
          }
          break;
        } catch (ae) {
          if ((r == null || r(ae), h !== void 0 && U >= h)) break;
          const te = Math.min(V * 2 ** (U - 1), v ?? 3e4);
          await C(te);
        }
      }
    })(),
  };
}
const cS = (n) => {
    switch (n) {
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
  oS = (n) => {
    switch (n) {
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
  fS = (n) => {
    switch (n) {
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
  Qy = ({ allowReserved: n, explode: r, name: u, style: c, value: f }) => {
    if (!r) {
      const v = (n ? f : f.map((p) => encodeURIComponent(p))).join(oS(c));
      switch (c) {
        case 'label':
          return `.${v}`;
        case 'matrix':
          return `;${u}=${v}`;
        case 'simple':
          return v;
        default:
          return `${u}=${v}`;
      }
    }
    const d = cS(c),
      h = f
        .map((v) =>
          c === 'label' || c === 'simple'
            ? n
              ? v
              : encodeURIComponent(v)
            : ir({ allowReserved: n, name: u, value: v }),
        )
        .join(d);
    return c === 'label' || c === 'matrix' ? d + h : h;
  },
  ir = ({ allowReserved: n, name: r, value: u }) => {
    if (u == null) return '';
    if (typeof u == 'object')
      throw new Error(
        'Deeply-nested arrays/objects aren’t supported. Provide your own `querySerializer()` to handle these.',
      );
    return `${r}=${n ? u : encodeURIComponent(u)}`;
  },
  Ky = ({
    allowReserved: n,
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
      Object.entries(f).forEach(([S, x]) => {
        p = [...p, S, n ? x : encodeURIComponent(x)];
      });
      const b = p.join(',');
      switch (c) {
        case 'form':
          return `${u}=${b}`;
        case 'label':
          return `.${b}`;
        case 'matrix':
          return `;${u}=${b}`;
        default:
          return b;
      }
    }
    const h = fS(c),
      v = Object.entries(f)
        .map(([p, b]) =>
          ir({
            allowReserved: n,
            name: c === 'deepObject' ? `${u}[${p}]` : p,
            value: b,
          }),
        )
        .join(h);
    return c === 'label' || c === 'matrix' ? h + v : v;
  },
  dS = /\{[^{}]+\}/g,
  mS = ({ path: n, url: r }) => {
    let u = r;
    const c = r.match(dS);
    if (c)
      for (const f of c) {
        let d = !1,
          h = f.substring(1, f.length - 1),
          v = 'simple';
        (h.endsWith('*') && ((d = !0), (h = h.substring(0, h.length - 1))),
          h.startsWith('.')
            ? ((h = h.substring(1)), (v = 'label'))
            : h.startsWith(';') && ((h = h.substring(1)), (v = 'matrix')));
        const p = n[h];
        if (p == null) continue;
        if (Array.isArray(p)) {
          u = u.replace(f, Qy({ explode: d, name: h, style: v, value: p }));
          continue;
        }
        if (typeof p == 'object') {
          u = u.replace(
            f,
            Ky({ explode: d, name: h, style: v, value: p, valueOnly: !0 }),
          );
          continue;
        }
        if (v === 'matrix') {
          u = u.replace(f, `;${ir({ name: h, value: p })}`);
          continue;
        }
        const b = encodeURIComponent(v === 'label' ? `.${p}` : p);
        u = u.replace(f, b);
      }
    return u;
  },
  hS = ({ baseUrl: n, path: r, query: u, querySerializer: c, url: f }) => {
    const d = f.startsWith('/') ? f : `/${f}`;
    let h = (n ?? '') + d;
    r && (h = mS({ path: r, url: h }));
    let v = u ? c(u) : '';
    return (v.startsWith('?') && (v = v.substring(1)), v && (h += `?${v}`), h);
  };
function Lh(n) {
  const r = n.body !== void 0;
  if (r && n.bodySerializer)
    return 'serializedBody' in n
      ? n.serializedBody !== void 0 && n.serializedBody !== ''
        ? n.serializedBody
        : null
      : n.body !== ''
        ? n.body
        : null;
  if (r) return n.body;
}
const yS = async (n, r) => {
    const u = typeof r == 'function' ? await r(n) : r;
    if (u)
      return n.scheme === 'bearer'
        ? `Bearer ${u}`
        : n.scheme === 'basic'
          ? `Basic ${btoa(u)}`
          : u;
  },
  Jy =
    ({ parameters: n = {}, ...r } = {}) =>
    (c) => {
      const f = [];
      if (c && typeof c == 'object')
        for (const d in c) {
          const h = c[d];
          if (h == null) continue;
          const v = n[d] || r;
          if (Array.isArray(h)) {
            const p = Qy({
              allowReserved: v.allowReserved,
              explode: !0,
              name: d,
              style: 'form',
              value: h,
              ...v.array,
            });
            p && f.push(p);
          } else if (typeof h == 'object') {
            const p = Ky({
              allowReserved: v.allowReserved,
              explode: !0,
              name: d,
              style: 'deepObject',
              value: h,
              ...v.object,
            });
            p && f.push(p);
          } else {
            const p = ir({ allowReserved: v.allowReserved, name: d, value: h });
            p && f.push(p);
          }
        }
      return f.join('&');
    },
  pS = (n) => {
    var u;
    if (!n) return 'stream';
    const r = (u = n.split(';')[0]) == null ? void 0 : u.trim();
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
  gS = (n, r) => {
    var u, c;
    return r
      ? !!(
          n.headers.has(r) ||
          ((u = n.query) != null && u[r]) ||
          ((c = n.headers.get('Cookie')) != null && c.includes(`${r}=`))
        )
      : !1;
  },
  bS = async ({ security: n, ...r }) => {
    for (const u of n) {
      if (gS(r, u.name)) continue;
      const c = await yS(u, r.auth);
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
  Yh = (n) =>
    hS({
      baseUrl: n.baseUrl,
      path: n.path,
      query: n.query,
      querySerializer:
        typeof n.querySerializer == 'function'
          ? n.querySerializer
          : Jy(n.querySerializer),
      url: n.url,
    }),
  Gh = (n, r) => {
    var c;
    const u = { ...n, ...r };
    return (
      (c = u.baseUrl) != null &&
        c.endsWith('/') &&
        (u.baseUrl = u.baseUrl.substring(0, u.baseUrl.length - 1)),
      (u.headers = $y(n.headers, r.headers)),
      u
    );
  },
  vS = (n) => {
    const r = [];
    return (
      n.forEach((u, c) => {
        r.push([c, u]);
      }),
      r
    );
  },
  $y = (...n) => {
    const r = new Headers();
    for (const u of n) {
      if (!u) continue;
      const c = u instanceof Headers ? vS(u) : Object.entries(u);
      for (const [f, d] of c)
        if (d === null) r.delete(f);
        else if (Array.isArray(d)) for (const h of d) r.append(f, h);
        else
          d !== void 0 &&
            r.set(f, typeof d == 'object' ? JSON.stringify(d) : d);
    }
    return r;
  };
class Mc {
  constructor() {
    el(this, 'fns', []);
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
const xS = () => ({ error: new Mc(), request: new Mc(), response: new Mc() }),
  SS = Jy({
    allowReserved: !1,
    array: { explode: !0, style: 'form' },
    object: { explode: !0, style: 'deepObject' },
  }),
  ES = { 'Content-Type': 'application/json' },
  Wy = (n = {}) => ({
    ...rS,
    headers: ES,
    parseAs: 'auto',
    querySerializer: SS,
    ...n,
  }),
  Fy = (n = {}) => {
    let r = Gh(Wy(), n);
    const u = () => ({ ...r }),
      c = (S) => ((r = Gh(r, S)), u()),
      f = xS(),
      d = async (S) => {
        const x = {
          ...r,
          ...S,
          fetch: S.fetch ?? r.fetch ?? globalThis.fetch,
          headers: $y(r.headers, S.headers),
          serializedBody: void 0,
        };
        (x.security && (await bS({ ...x, security: x.security })),
          x.requestValidator && (await x.requestValidator(x)),
          x.body !== void 0 &&
            x.bodySerializer &&
            (x.serializedBody = x.bodySerializer(x.body)),
          (x.body === void 0 || x.serializedBody === '') &&
            x.headers.delete('Content-Type'));
        const C = x,
          Z = Yh(C);
        return { opts: C, url: Z };
      },
      h = async (S) => {
        const { opts: x, url: C } = await d(S),
          Z = { redirect: 'follow', ...x, body: Lh(x) };
        let G = new Request(C, Z);
        for (const W of f.request.fns) W && (G = await W(G, x));
        const V = x.fetch;
        let U;
        try {
          U = await V(G);
        } catch (W) {
          let $ = W;
          for (const X of f.error.fns) X && ($ = await X(W, void 0, G, x));
          if ((($ = $ || {}), x.throwOnError)) throw $;
          return x.responseStyle === 'data'
            ? void 0
            : { error: $, request: G, response: void 0 };
        }
        for (const W of f.response.fns) W && (U = await W(U, G, x));
        const B = { request: G, response: U };
        if (U.ok) {
          const W =
            (x.parseAs === 'auto'
              ? pS(U.headers.get('Content-Type'))
              : x.parseAs) ?? 'json';
          if (U.status === 204 || U.headers.get('Content-Length') === '0') {
            let X;
            switch (W) {
              case 'arrayBuffer':
              case 'blob':
              case 'text':
                X = await U[W]();
                break;
              case 'formData':
                X = new FormData();
                break;
              case 'stream':
                X = U.body;
                break;
              case 'json':
              default:
                X = {};
                break;
            }
            return x.responseStyle === 'data' ? X : { data: X, ...B };
          }
          let $;
          switch (W) {
            case 'arrayBuffer':
            case 'blob':
            case 'formData':
            case 'text':
              $ = await U[W]();
              break;
            case 'json': {
              const X = await U.text();
              $ = X ? JSON.parse(X) : {};
              break;
            }
            case 'stream':
              return x.responseStyle === 'data'
                ? U.body
                : { data: U.body, ...B };
          }
          return (
            W === 'json' &&
              (x.responseValidator && (await x.responseValidator($)),
              x.responseTransformer && ($ = await x.responseTransformer($))),
            x.responseStyle === 'data' ? $ : { data: $, ...B }
          );
        }
        const ne = await U.text();
        let ae;
        try {
          ae = JSON.parse(ne);
        } catch {}
        const te = ae ?? ne;
        let le = te;
        for (const W of f.error.fns) W && (le = await W(te, U, G, x));
        if (((le = le || {}), x.throwOnError)) throw le;
        return x.responseStyle === 'data' ? void 0 : { error: le, ...B };
      },
      v = (S) => (x) => h({ ...x, method: S }),
      p = (S) => async (x) => {
        const { opts: C, url: Z } = await d(x);
        return uS({
          ...C,
          body: C.body,
          headers: C.headers,
          method: S,
          onRequest: async (G, V) => {
            let U = new Request(G, V);
            for (const B of f.request.fns) B && (U = await B(U, C));
            return U;
          },
          serializedBody: Lh(C),
          url: Z,
        });
      };
    return {
      buildUrl: (S) => Yh({ ...r, ...S }),
      connect: v('CONNECT'),
      delete: v('DELETE'),
      get: v('GET'),
      getConfig: u,
      head: v('HEAD'),
      interceptors: f,
      options: v('OPTIONS'),
      patch: v('PATCH'),
      post: v('POST'),
      put: v('PUT'),
      request: h,
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
      trace: v('TRACE'),
    };
  },
  at = Fy(Wy({ baseUrl: 'http://localhost:7777' })),
  TS = (n) =>
    ((n == null ? void 0 : n.client) ?? at).get({ url: '/admin/setup', ...n }),
  AS = (n) =>
    (n.client ?? at).put({
      url: '/admin/setup',
      ...n,
      headers: { 'Content-Type': 'application/json', ...n.headers },
    }),
  wS = (n) =>
    (n.client ?? at).post({
      url: '/email/start',
      ...n,
      headers: { 'Content-Type': 'application/json', ...n.headers },
    }),
  jS = (n) =>
    (n.client ?? at).post({
      url: '/email/verify',
      ...n,
      headers: { 'Content-Type': 'application/json', ...n.headers },
    }),
  NS = (n) =>
    ((n == null ? void 0 : n.client) ?? at).get({
      security: [{ scheme: 'bearer', type: 'http' }],
      url: '/me',
      ...n,
    }),
  RS = (n) =>
    (n.client ?? at).post({
      url: '/session/refresh',
      ...n,
      headers: { 'Content-Type': 'application/json', ...n.headers },
    }),
  zS = (n) =>
    ((n == null ? void 0 : n.client) ?? at).post({
      security: [{ scheme: 'bearer', type: 'http' }],
      url: '/session/logout',
      ...n,
    }),
  _S = (n) =>
    (n.client ?? at).post({
      security: [{ scheme: 'bearer', type: 'http' }],
      url: '/session/{session_id}/logout',
      ...n,
    }),
  CS = (n) =>
    (n.client ?? at).post({
      url: '/ed25519/start',
      ...n,
      headers: { 'Content-Type': 'application/json', ...n.headers },
    }),
  OS = (n) =>
    (n.client ?? at).post({
      url: '/ed25519/verify',
      ...n,
      headers: { 'Content-Type': 'application/json', ...n.headers },
    }),
  MS = (n) =>
    ((n == null ? void 0 : n.client) ?? at).get({
      security: [{ scheme: 'bearer', type: 'http' }],
      url: '/ed25519/credentials',
      ...n,
    }),
  DS = (n) =>
    (n.client ?? at).post({
      security: [{ scheme: 'bearer', type: 'http' }],
      url: '/ed25519/credentials',
      ...n,
      headers: { 'Content-Type': 'application/json', ...n.headers },
    }),
  US = (n) =>
    (n.client ?? at).delete({
      security: [{ scheme: 'bearer', type: 'http' }],
      url: '/ed25519/credentials/{id}',
      ...n,
    }),
  kS = (n) =>
    (n.client ?? at).patch({
      security: [{ scheme: 'bearer', type: 'http' }],
      url: '/ed25519/credentials/{id}',
      ...n,
      headers: { 'Content-Type': 'application/json', ...n.headers },
    }),
  BS = (n) =>
    (n.client ?? at).post({
      security: [{ scheme: 'bearer', type: 'http' }],
      url: '/webauthn/register/options',
      ...n,
      headers: { 'Content-Type': 'application/json', ...n.headers },
    }),
  HS = (n) =>
    (n.client ?? at).post({
      security: [{ scheme: 'bearer', type: 'http' }],
      url: '/webauthn/register/verify',
      ...n,
      headers: { 'Content-Type': 'application/json', ...n.headers },
    }),
  qS = (n) =>
    (n.client ?? at).post({
      url: '/webauthn/authenticate/options',
      ...n,
      headers: { 'Content-Type': 'application/json', ...n.headers },
    }),
  LS = (n) =>
    (n.client ?? at).post({
      url: '/webauthn/authenticate/verify',
      ...n,
      headers: { 'Content-Type': 'application/json', ...n.headers },
    }),
  YS = (n) =>
    (n.client ?? at).delete({
      security: [{ scheme: 'bearer', type: 'http' }],
      url: '/webauthn/credentials/{id}',
      ...n,
    }),
  GS = (n) =>
    ((n == null ? void 0 : n.client) ?? at).get({ url: '/jwks', ...n });
function XS(n, r) {
  const u = new Error(`${n}: ${r}`);
  return ((u.name = 'AuthMiniSdkError'), (u.code = n), u);
}
function ZS(n) {
  if (!n.baseUrl) throw XS('sdk_init_failed', 'Missing API base URL');
  const r = Fy({ auth: n.auth, baseUrl: n.baseUrl, fetch: n.fetch });
  return {
    admin: {
      setup: {
        get: (u) => TS({ ...(u ?? {}), client: r }),
        update: (u) => AS({ ...u, client: r }),
      },
    },
    email: {
      start: (u) => wS({ ...u, client: r }),
      verify: (u) => jS({ ...u, client: r }),
    },
    me: { get: (u) => NS({ ...(u ?? {}), client: r }) },
    session: {
      refresh: (u) => RS({ ...u, client: r }),
      logoutCurrent: (u) => zS({ ...(u ?? {}), client: r }),
      logoutPeer: (u) => _S({ ...u, client: r }),
    },
    ed25519: {
      startAuthentication: (u) => CS({ ...u, client: r }),
      verifyAuthentication: (u) => OS({ ...u, client: r }),
      listCredentials: (u) => MS({ ...(u ?? {}), client: r }),
      createCredential: (u) => DS({ ...u, client: r }),
      deleteCredential: (u) => US({ ...u, client: r }),
      updateCredential: (u) => kS({ ...u, client: r }),
    },
    webauthn: {
      createRegistrationOptions: (u) => BS({ ...u, client: r }),
      verifyRegistration: (u) => HS({ ...u, client: r }),
      createAuthenticationOptions: (u) => qS({ ...u, client: r }),
      verifyAuthentication: (u) => LS({ ...u, client: r }),
      deleteCredential: (u) => YS({ ...u, client: r }),
    },
    jwks: { list: (u) => GS({ ...(u ?? {}), client: r }) },
  };
}
function Xh(n, r) {
  if (typeof n == 'function') return n(r);
  n != null && (n.current = r);
}
function VS(...n) {
  return (r) => {
    let u = !1;
    const c = n.map((f) => {
      const d = Xh(f, r);
      return (!u && typeof d == 'function' && (u = !0), d);
    });
    if (u)
      return () => {
        for (let f = 0; f < c.length; f++) {
          const d = c[f];
          typeof d == 'function' ? d() : Xh(n[f], null);
        }
      };
  };
}
var QS = Symbol.for('react.lazy'),
  ar = _b[' use '.trim().toString()];
function KS(n) {
  return typeof n == 'object' && n !== null && 'then' in n;
}
function Iy(n) {
  return (
    n != null &&
    typeof n == 'object' &&
    '$$typeof' in n &&
    n.$$typeof === QS &&
    '_payload' in n &&
    KS(n._payload)
  );
}
function JS(n) {
  const r = $S(n),
    u = A.forwardRef((c, f) => {
      let { children: d, ...h } = c;
      Iy(d) && typeof ar == 'function' && (d = ar(d._payload));
      const v = A.Children.toArray(d),
        p = v.find(FS);
      if (p) {
        const b = p.props.children,
          S = v.map((x) =>
            x === p
              ? A.Children.count(b) > 1
                ? A.Children.only(null)
                : A.isValidElement(b)
                  ? b.props.children
                  : null
              : x,
          );
        return m.jsx(r, {
          ...h,
          ref: f,
          children: A.isValidElement(b) ? A.cloneElement(b, void 0, S) : null,
        });
      }
      return m.jsx(r, { ...h, ref: f, children: d });
    });
  return ((u.displayName = `${n}.Slot`), u);
}
function $S(n) {
  const r = A.forwardRef((u, c) => {
    let { children: f, ...d } = u;
    if (
      (Iy(f) && typeof ar == 'function' && (f = ar(f._payload)),
      A.isValidElement(f))
    ) {
      const h = PS(f),
        v = IS(d, f.props);
      return (
        f.type !== A.Fragment && (v.ref = c ? VS(c, h) : h),
        A.cloneElement(f, v)
      );
    }
    return A.Children.count(f) > 1 ? A.Children.only(null) : null;
  });
  return ((r.displayName = `${n}.SlotClone`), r);
}
var WS = Symbol('radix.slottable');
function FS(n) {
  return (
    A.isValidElement(n) &&
    typeof n.type == 'function' &&
    '__radixId' in n.type &&
    n.type.__radixId === WS
  );
}
function IS(n, r) {
  const u = { ...r };
  for (const c in r) {
    const f = n[c],
      d = r[c];
    /^on[A-Z]/.test(c)
      ? f && d
        ? (u[c] = (...v) => {
            const p = d(...v);
            return (f(...v), p);
          })
        : f && (u[c] = f)
      : c === 'style'
        ? (u[c] = { ...f, ...d })
        : c === 'className' && (u[c] = [f, d].filter(Boolean).join(' '));
  }
  return { ...n, ...u };
}
function PS(n) {
  var c, f;
  let r =
      (c = Object.getOwnPropertyDescriptor(n.props, 'ref')) == null
        ? void 0
        : c.get,
    u = r && 'isReactWarning' in r && r.isReactWarning;
  return u
    ? n.ref
    : ((r =
        (f = Object.getOwnPropertyDescriptor(n, 'ref')) == null
          ? void 0
          : f.get),
      (u = r && 'isReactWarning' in r && r.isReactWarning),
      u ? n.props.ref : n.props.ref || n.ref);
}
var e1 = [
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
  t1 = e1.reduce((n, r) => {
    const u = JS(`Primitive.${r}`),
      c = A.forwardRef((f, d) => {
        const { asChild: h, ...v } = f,
          p = h ? u : r;
        return (
          typeof window < 'u' && (window[Symbol.for('radix-ui')] = !0),
          m.jsx(p, { ...v, ref: d })
        );
      });
    return ((c.displayName = `Primitive.${r}`), { ...n, [r]: c });
  }, {}),
  a1 = 'Separator',
  Zh = 'horizontal',
  l1 = ['horizontal', 'vertical'],
  Py = A.forwardRef((n, r) => {
    const { decorative: u, orientation: c = Zh, ...f } = n,
      d = n1(c) ? c : Zh,
      v = u
        ? { role: 'none' }
        : {
            'aria-orientation': d === 'vertical' ? d : void 0,
            role: 'separator',
          };
    return m.jsx(t1.div, { 'data-orientation': d, ...v, ...f, ref: r });
  });
Py.displayName = a1;
function n1(n) {
  return l1.includes(n);
}
var ep = Py;
const tp = A.forwardRef(
  (
    { className: n, orientation: r = 'horizontal', decorative: u = !0, ...c },
    f,
  ) =>
    m.jsx(ep, {
      ref: f,
      decorative: u,
      orientation: r,
      className: Dt(
        'shrink-0 bg-slate-200',
        r === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
        n,
      ),
      ...c,
    }),
);
tp.displayName = ep.displayName;
const Vh = 587;
function Qh(n) {
  return typeof n == 'object' && n !== null && 'error' in n
    ? String(n.error)
    : 'setup_failed';
}
function i1() {
  const { config: n } = nl(),
    [r, u] = A.useState(n.resolvedServerBaseUrl),
    [c, f] = A.useState(n.pageOrigin),
    [d, h] = A.useState('Admin key'),
    [v, p] = A.useState(''),
    [b, S] = A.useState(''),
    [x, C] = A.useState(''),
    [Z, G] = A.useState(Vh),
    [V, U] = A.useState(''),
    [B, ne] = A.useState(''),
    [ae, te] = A.useState(''),
    [le, W] = A.useState('Auth Mini'),
    [$, X] = A.useState(!1),
    [ye, Ye] = A.useState(1),
    [Re, be] = A.useState('idle'),
    [Ue, ze] = A.useState(''),
    [P, R] = A.useState(null);
  async function q(ee) {
    (ee.preventDefault(), be('saving'), ze(''));
    try {
      const J = ZS({ baseUrl: n.resolvedServerBaseUrl }),
        w =
          x.trim() === ''
            ? void 0
            : {
                host: x,
                port: Z,
                username: V,
                password: B,
                from_email: ae,
                from_name: le,
                secure: $,
                weight: ye,
              },
        g = v.trim() === '' ? void 0 : { name: d.trim(), public_key: v.trim() },
        T = await J.admin.setup.update({
          body: { issuer: r, origin: c, admin_ed25519: g, smtp: w },
          throwOnError: !0,
        });
      if (!T.data) throw new Error('setup_failed');
      (R(T.data), be('saved'), ze('Setup saved'));
    } catch (J) {
      (be('failed'), ze(Qh(J)));
    }
  }
  async function se() {
    (be('saving'), ze(''));
    try {
      const ee = await Vy();
      (p(ee.publicKey), S(ee.seed), ze('Admin key generated'));
    } catch (ee) {
      (be('failed'), ze(Qh(ee)));
      return;
    }
    be('idle');
  }
  return m.jsx(vn, {
    title: 'Setup',
    description:
      'Configure app metadata, admin access, allowed page origin, and SMTP for this auth-mini instance.',
    children: m.jsxs('div', {
      className: 'space-y-8',
      children: [
        m.jsxs('form', {
          className: 'space-y-5',
          onSubmit: q,
          children: [
            m.jsxs('div', {
              className: 'grid gap-4 md:grid-cols-2',
              children: [
                m.jsxs('label', {
                  className:
                    'grid gap-2 text-sm font-medium text-slate-700 md:col-span-2',
                  children: [
                    m.jsx('span', { children: 'Issuer' }),
                    m.jsx(rt, {
                      'aria-label': 'Issuer',
                      value: r,
                      onChange: (ee) => {
                        u(ee.currentTarget.value);
                      },
                      required: !0,
                    }),
                  ],
                }),
                m.jsxs('label', {
                  className:
                    'grid gap-2 text-sm font-medium text-slate-700 md:col-span-2',
                  children: [
                    m.jsx('span', { children: 'Allowed page origin' }),
                    m.jsx(rt, {
                      'aria-label': 'Allowed page origin',
                      value: c,
                      onChange: (ee) => {
                        f(ee.currentTarget.value);
                      },
                      required: !0,
                    }),
                  ],
                }),
                m.jsxs('label', {
                  className: 'grid gap-2 text-sm font-medium text-slate-700',
                  children: [
                    m.jsx('span', { children: 'Admin key name' }),
                    m.jsx(rt, {
                      'aria-label': 'Admin key name',
                      value: d,
                      onChange: (ee) => {
                        h(ee.currentTarget.value);
                      },
                    }),
                  ],
                }),
                m.jsxs('label', {
                  className: 'grid gap-2 text-sm font-medium text-slate-700',
                  children: [
                    m.jsx('span', { children: 'Admin Ed25519 public key' }),
                    m.jsx(rt, {
                      'aria-label': 'Admin Ed25519 public key',
                      value: v,
                      onChange: (ee) => {
                        p(ee.currentTarget.value);
                      },
                    }),
                  ],
                }),
                m.jsxs('label', {
                  className: 'grid gap-2 text-sm font-medium text-slate-700',
                  children: [
                    m.jsx('span', { children: 'SMTP host' }),
                    m.jsx(rt, {
                      'aria-label': 'SMTP host',
                      value: x,
                      onChange: (ee) => {
                        C(ee.currentTarget.value);
                      },
                      placeholder: 'smtp.example.com',
                    }),
                  ],
                }),
                m.jsxs('label', {
                  className: 'grid gap-2 text-sm font-medium text-slate-700',
                  children: [
                    m.jsx('span', { children: 'SMTP port' }),
                    m.jsx(rt, {
                      'aria-label': 'SMTP port',
                      min: 1,
                      type: 'number',
                      value: Z,
                      onChange: (ee) => {
                        G(ee.currentTarget.valueAsNumber || Vh);
                      },
                    }),
                  ],
                }),
                m.jsxs('label', {
                  className: 'grid gap-2 text-sm font-medium text-slate-700',
                  children: [
                    m.jsx('span', { children: 'SMTP username' }),
                    m.jsx(rt, {
                      'aria-label': 'SMTP username',
                      value: V,
                      onChange: (ee) => {
                        U(ee.currentTarget.value);
                      },
                    }),
                  ],
                }),
                m.jsxs('label', {
                  className: 'grid gap-2 text-sm font-medium text-slate-700',
                  children: [
                    m.jsx('span', { children: 'SMTP password' }),
                    m.jsx(rt, {
                      'aria-label': 'SMTP password',
                      type: 'password',
                      value: B,
                      onChange: (ee) => {
                        ne(ee.currentTarget.value);
                      },
                    }),
                  ],
                }),
                m.jsxs('label', {
                  className: 'grid gap-2 text-sm font-medium text-slate-700',
                  children: [
                    m.jsx('span', { children: 'From email' }),
                    m.jsx(rt, {
                      'aria-label': 'From email',
                      type: 'email',
                      value: ae,
                      onChange: (ee) => {
                        te(ee.currentTarget.value);
                      },
                      placeholder: 'noreply@example.com',
                    }),
                  ],
                }),
                m.jsxs('label', {
                  className: 'grid gap-2 text-sm font-medium text-slate-700',
                  children: [
                    m.jsx('span', { children: 'From name' }),
                    m.jsx(rt, {
                      'aria-label': 'From name',
                      value: le,
                      onChange: (ee) => {
                        W(ee.currentTarget.value);
                      },
                    }),
                  ],
                }),
                m.jsxs('label', {
                  className: 'grid gap-2 text-sm font-medium text-slate-700',
                  children: [
                    m.jsx('span', { children: 'SMTP weight' }),
                    m.jsx(rt, {
                      'aria-label': 'SMTP weight',
                      min: 1,
                      type: 'number',
                      value: ye,
                      onChange: (ee) => {
                        Ye(ee.currentTarget.valueAsNumber || 1);
                      },
                    }),
                  ],
                }),
                m.jsxs('label', {
                  className:
                    'flex items-center gap-3 text-sm font-medium text-slate-700',
                  children: [
                    m.jsx('input', {
                      checked: $,
                      className: 'h-4 w-4 rounded border-slate-300',
                      onChange: (ee) => {
                        X(ee.currentTarget.checked);
                      },
                      type: 'checkbox',
                    }),
                    m.jsx('span', { children: 'Use TLS' }),
                  ],
                }),
              ],
            }),
            m.jsxs('div', {
              className: 'flex flex-wrap items-center gap-3',
              children: [
                m.jsx(yt, {
                  disabled: Re === 'saving',
                  onClick: () => {
                    se();
                  },
                  type: 'button',
                  children: 'Generate admin key',
                }),
                m.jsx(yt, {
                  disabled: Re === 'saving',
                  type: 'submit',
                  children: Re === 'saving' ? 'Saving...' : 'Save setup',
                }),
                Ue
                  ? m.jsx('span', {
                      className: 'text-sm text-slate-500',
                      role: 'status',
                      children: Ue,
                    })
                  : null,
              ],
            }),
          ],
        }),
        P
          ? m.jsxs('section', {
              className: 'space-y-3 text-sm text-slate-600',
              children: [
                m.jsxs('div', {
                  className: 'space-y-1',
                  children: [
                    m.jsx('strong', {
                      className: 'block text-slate-950',
                      children: 'Issuer',
                    }),
                    m.jsx('div', { children: P.issuer }),
                  ],
                }),
                m.jsxs('div', {
                  className: 'space-y-1',
                  children: [
                    m.jsx('strong', {
                      className: 'block text-slate-950',
                      children: 'Admin',
                    }),
                    m.jsx('div', {
                      children: P.admin_ed25519
                        ? P.admin_ed25519.name
                        : 'Not configured',
                    }),
                  ],
                }),
                b
                  ? m.jsxs('div', {
                      className: 'space-y-1',
                      children: [
                        m.jsx('strong', {
                          className: 'block text-slate-950',
                          children: 'Generated admin seed',
                        }),
                        m.jsx('div', { className: 'break-all', children: b }),
                      ],
                    })
                  : null,
                m.jsxs('div', {
                  className: 'space-y-1',
                  children: [
                    m.jsx('strong', {
                      className: 'block text-slate-950',
                      children: 'Allowed origins',
                    }),
                    m.jsx('div', {
                      children: P.origins.map((ee) => ee.origin).join(', '),
                    }),
                  ],
                }),
                m.jsxs('div', {
                  className: 'space-y-1',
                  children: [
                    m.jsx('strong', {
                      className: 'block text-slate-950',
                      children: 'SMTP',
                    }),
                    m.jsx('div', {
                      children: P.smtp ? P.smtp.host : 'Not configured',
                    }),
                  ],
                }),
              ],
            })
          : null,
        m.jsx(tp, {}),
        m.jsxs('section', {
          className: 'space-y-3 text-sm text-slate-600',
          children: [
            m.jsxs('div', {
              className: 'space-y-1',
              children: [
                m.jsx('strong', {
                  className: 'block text-slate-950',
                  children: 'API base',
                }),
                m.jsx('div', { children: n.serverBaseUrl }),
              ],
            }),
            m.jsxs('div', {
              className: 'space-y-1',
              children: [
                m.jsx('strong', {
                  className: 'block text-slate-950',
                  children: 'Page origin',
                }),
                m.jsx('div', { children: n.pageOrigin }),
              ],
            }),
          ],
        }),
      ],
    }),
  });
}
function s1() {
  return m.jsx(vx, {
    children: m.jsx(H0, {
      children: m.jsxs(ja, {
        element: m.jsx(Ex, {}),
        children: [
          m.jsx(ja, { path: '/', element: m.jsx(Px, {}) }),
          m.jsx(ja, { path: '/setup', element: m.jsx(i1, {}) }),
          m.jsx(ja, { path: '/email', element: m.jsx(Rx, {}) }),
          m.jsx(ja, { path: '/ed25519', element: m.jsx(Jx, {}) }),
          m.jsx(ja, { path: '/passkey', element: m.jsx(eS, {}) }),
          m.jsx(ja, { path: '/credentials', element: m.jsx(Nx, {}) }),
          m.jsx(ja, { path: '/session', element: m.jsx(sS, {}) }),
        ],
      }),
    }),
  });
}
Bb.createRoot(document.getElementById('root')).render(
  m.jsx(Jh.StrictMode, { children: m.jsx(uv, { children: m.jsx(s1, {}) }) }),
);
