var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var YA;
(function (YA) {
    // 正则:去掉字符串首尾空白字符
    YA.trimRegx = /(^\s+)|(\s+$)/gi;
    var Exception = /** @class */ (function (_super) {
        __extends(Exception, _super);
        function Exception(message, internalError, extra) {
            var _this = _super.call(this, message) || this;
            if (extra === undefined) {
                if (internalError instanceof Error) {
                    _this.internal_error = internalError;
                }
                else {
                    _this.extra = internalError;
                }
            }
            else {
                _this.internal_error = internalError;
                _this.extra = extra;
            }
            return _this;
        }
        return Exception;
    }(Error));
    YA.Exception = Exception;
    function is_array(obj) {
        if (!obj)
            return false;
        return Object.prototype.toString.call(obj) === "[object Array]";
    }
    YA.is_array = is_array;
    /**
     * 管道
     *
     * @export
     * @class Pipe
     */
    var Pipe = /** @class */ (function () {
        function Pipe() {
            if (arguments.length) {
                this._pipes = [];
                for (var i = 0, j = arguments.length; i < j; i++) {
                    this._pipes.push({
                        command: arguments[i], args: null
                    });
                }
            }
        }
        Pipe.prototype.pipe = function (args, command) {
            if (typeof args === "function") {
                command = args;
                args = undefined;
            }
            (this._pipes || (this._pipes = [])).push({
                command: command,
                args: args
            });
            return this;
        };
        Pipe.prototype.removePipe = function (args, command) {
            if (typeof args === "function") {
                command = args;
                args = undefined;
            }
            var items = this._pipes;
            for (var i in items) {
                var item = items.shift();
                if (item.command !== command || item.args != args) {
                    items.push(item);
                }
            }
            return this;
        };
        Pipe.prototype.execute = function (input, self) {
            var items = this._pipes;
            self || (self = this);
            for (var i in items) {
                var item = items[i];
                var args = item.args || [];
                args.unshift(input);
                input = item.command.apply(self, args);
                args.shift();
            }
            return input;
        };
        Pipe.prototype.bind = function (first) {
            var me = this;
            var result = function () {
                return me.execute(first.apply(this, arguments), this);
            };
            result.$pipe = this;
            return result;
        };
        return Pipe;
    }());
    YA.Pipe = Pipe;
    /**
     * 拦截器/装饰器
     *
     * @export
     * @class Interceptor
     */
    var Interceptor = /** @class */ (function () {
        function Interceptor(method) {
            if (method && typeof method !== 'function')
                throw new Exception("拦截器必须应用于函数");
            this.raw = method;
            var me = this;
            var first = this._next = method ? function (args) {
                method.apply(this, args);
            } : function () { };
            var result = function () {
                var args = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    args[_i] = arguments[_i];
                }
                if (me._next === first) {
                    return method.apply(this, arguments);
                }
                else {
                    return me._next.call(this, args);
                }
                //return me.next===first?method.apply():me._next.call(this,args);
            };
            result.intercept = function (interceptor) {
                me.intercept(interceptor);
                return this;
            };
            result.$interceptor = this;
            this.func = result;
        }
        Interceptor.prototype.intercept = function (interceptor) {
            var inner = this._next;
            this._next = function (args) {
                args.unshift(inner);
                return interceptor.apply(this, args);
            };
            return this;
        };
        Interceptor.prototype.execute = function (me, args) {
            return this.func.apply(me, args);
        };
        return Interceptor;
    }());
    YA.Interceptor = Interceptor;
    function interceptable() {
        return function (target, propertyKey, descriptor) {
            descriptor.value = new Interceptor(descriptor.value);
        };
    }
    YA.interceptable = interceptable;
    /**
     * 发布/订阅
     *
     * @export
     * @class Observable
     * @implements {IObservable}
     */
    var Observable = /** @class */ (function () {
        function Observable(target) {
            if (target) {
                target.subscribe = this.subscribe;
                target.unsubscribe = this.unsubscribe;
                target.publish = this.publish;
            }
        }
        Observable.prototype.subscribe = function (observer) {
            (this.$subscribers || (this.$subscribers = [])).push(observer);
            return this;
        };
        Observable.prototype.unsubscribe = function (observer) {
            if (!this.$subscribers)
                return this;
            for (var i = 0, j = this.$subscribers.length; i < j; i++) {
                var existed = this.$subscribers.shift();
                if (observer === existed)
                    continue;
                this.$subscribers.push(existed);
            }
            return this;
        };
        Observable.prototype.publish = function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            if (!this.$subscribers)
                return this;
            for (var i = 0, j = this.$subscribers.length; i < j; i++) {
                var existed = this.$subscribers[i];
                existed.apply(this, arguments);
            }
            return this;
        };
        return Observable;
    }());
    YA.Observable = Observable;
    /**
     * 事件
     *
     * @export
     * @class Eventable
     * @implements {IEventable}
     */
    var Eventable = /** @class */ (function () {
        function Eventable(target) {
            if (target) {
                target.attachEvent = this.attachEvent;
                target.detechEvent = this.detechEvent;
                target.dispachEvent = this.dispachEvent;
            }
        }
        Eventable.prototype.attachEvent = function (eventId, listener, extras) {
            var events = this._events || (this._events = {});
            var listeners = events[eventId] || (events[eventId] = []);
            listeners.push({ listener: listener, extras: extras });
            return this;
        };
        Eventable.prototype.detechEvent = function (eventId, listener, extras) {
            var events = this._events;
            if (!events)
                return this;
            var listeners = events[eventId];
            if (!listeners)
                return this;
            for (var i = 0, j = listeners.length; i < j; i++) {
                var existed = listeners.shift();
                if (existed.listener === listener && existed.extras === extras)
                    continue;
                listeners.push(existed);
            }
            if (listeners.length == 0)
                delete events[eventId];
            return this;
        };
        Eventable.prototype.dispachEvent = function (eventId, evtArgs, extras) {
            var events = this._events;
            if (!events)
                return this;
            var listeners = events[eventId];
            if (!listeners)
                return this;
            evtArgs || (evtArgs = {});
            evtArgs.eventId = eventId;
            evtArgs.sender = this;
            for (var i = 0, j = listeners.length; i < j; i++) {
                var existed = listeners[i];
                if (existed.extras === extras)
                    existed.listener(evtArgs);
            }
            return this;
        };
        return Eventable;
    }());
    YA.Eventable = Eventable;
    var Proxy = /** @class */ (function () {
        function Proxy(target, methods, proxy) {
            proxy || (proxy === this);
            var makeProxyMethod = function (name) {
                var method = target[name];
                if (typeof method !== 'function')
                    return;
                proxy[name] = function () { return method.apply(target, arguments); };
            };
            if (methods) {
                for (var i in methods) {
                    makeProxyMethod(methods[i]);
                }
            }
            else {
                for (var n in target) {
                    makeProxyMethod(n);
                }
            }
        }
        return Proxy;
    }());
    YA.Proxy = Proxy;
    var AwaitorStates;
    (function (AwaitorStates) {
        AwaitorStates[AwaitorStates["padding"] = 0] = "padding";
        AwaitorStates[AwaitorStates["fulfilled"] = 1] = "fulfilled";
        AwaitorStates[AwaitorStates["rejected"] = -1] = "rejected";
    })(AwaitorStates = YA.AwaitorStates || (YA.AwaitorStates = {}));
    var AwaitorTypes;
    (function (AwaitorTypes) {
        AwaitorTypes[AwaitorTypes["awaitor"] = 0] = "awaitor";
        AwaitorTypes[AwaitorTypes["deferrer"] = 1] = "deferrer";
    })(AwaitorTypes = YA.AwaitorTypes || (YA.AwaitorTypes = {}));
    /**
     * 简单的异步对象
     *
     * @export
     * @class Awaitor<T>
     */
    var Awaitor = /** @class */ (function () {
        function Awaitor(asyncProcess, resolveByApply) {
            var _this = this;
            this.awaitor_status = AwaitorStates.padding;
            this.awaitor_type = asyncProcess ? AwaitorTypes.awaitor : AwaitorTypes.deferrer;
            var internalRresolve = function (value) {
                var fulfills = _this._fulfillCallbacks;
                _this.awaitor_value = value;
                _this.awaitor_status = AwaitorStates.fulfilled;
                _this._fulfillCallbacks = _this._rejectCallbacks = undefined;
                _this.awaitor_status = AwaitorStates.fulfilled;
                if (fulfills && fulfills.length) {
                    setTimeout(function () { for (var i in fulfills)
                        fulfills[i](value); }, 0);
                }
                internalRresolve = resolve = reject = function (value) { return _this; };
                return _this;
            };
            var resolve = function (value) {
                if (value === _this)
                    throw new TypeError("循环引用");
                if (_this.awaitor_status !== AwaitorStates.padding) {
                    console.warn("非Padding状态的Awaitor，反复调用了resolve函数");
                    return _this;
                }
                if (value && value.then && (typeof value.then === "function")) {
                    value.then(internalRresolve, reject);
                }
                else
                    internalRresolve(value);
                return _this;
            };
            var reject = function (value) {
                if (_this.awaitor_status !== AwaitorStates.padding) {
                    console.warn("非Padding状态的Awaitor，反复调用了reject函数");
                    return _this;
                }
                var rejects = _this._rejectCallbacks;
                _this.awaitor_value = value;
                _this.awaitor_status = AwaitorStates.rejected;
                _this._fulfillCallbacks = _this._rejectCallbacks = undefined;
                if (rejects && rejects.length) {
                    setTimeout(function () { for (var i in rejects)
                        rejects[i](value); }, 0);
                }
                return _this;
            };
            this.success = this.ok = this.done;
            this.error = this.catch = this.fail;
            if (asyncProcess) {
                this.resolve = this.reject = function (val) { throw new Error("\u4E0D\u662Fdeferrer\u5BF9\u8C61\uFF0C\u4E0D\u5141\u8BB8\u8C03\u7528resolve/reject\u51FD\u6570."); };
                setTimeout(function () {
                    try {
                        asyncProcess(resolve, reject);
                    }
                    catch (ex) {
                        _this.reject(ex);
                    }
                }, 0);
            }
            else {
                this.resolve = resolve;
                this.reject = reject;
            }
        }
        Awaitor.prototype.then = function (onfulfilled, onrejected) {
            var _this = this;
            if (this.awaitor_status == AwaitorStates.padding) {
                if (onfulfilled)
                    (this._fulfillCallbacks || (this._fulfillCallbacks = [])).push(onfulfilled);
                if (onrejected)
                    (this._rejectCallbacks || (this._rejectCallbacks = [])).push(onrejected);
            }
            else if (this.awaitor_status == AwaitorStates.fulfilled) {
                if (onfulfilled)
                    setTimeout(function () { return onfulfilled(_this.awaitor_value); });
            }
            else if (this.awaitor_status == AwaitorStates.rejected) {
                if (onrejected)
                    setTimeout(function () { return onrejected(_this.awaitor_value); });
            }
            return this;
        };
        Awaitor.prototype.done = function (onfulfilled) {
            var _this = this;
            if (!onfulfilled)
                return this;
            if (this.awaitor_status === AwaitorStates.padding) {
                (this._fulfillCallbacks || (this._fulfillCallbacks = [])).push(onfulfilled);
            }
            else if (this.awaitor_status === AwaitorStates.fulfilled) {
                setTimeout(function () { return onfulfilled(_this.awaitor_value); });
            }
            return this;
        };
        Awaitor.prototype.fail = function (onrejected) {
            var _this = this;
            if (!onrejected)
                return this;
            if (this.awaitor_status === AwaitorStates.padding) {
                (this._rejectCallbacks || (this._rejectCallbacks = [])).push(onrejected);
            }
            else if (this.awaitor_status === AwaitorStates.rejected) {
                setTimeout(function () { return onrejected(_this.awaitor_value); });
            }
            return this;
        };
        Awaitor.prototype.complete = function (oncomplete) {
            var _this = this;
            if (!oncomplete)
                return this;
            if (this.awaitor_status === AwaitorStates.padding) {
                (this._fulfillCallbacks || (this._fulfillCallbacks = [])).push(function (arg) {
                    if (is_array(arg))
                        oncomplete.apply(_this, arg);
                    else
                        oncomplete.call(_this, arg);
                });
            }
            else if (this.awaitor_status === AwaitorStates.fulfilled) {
                if (is_array(this.awaitor_value))
                    setTimeout(function () { return oncomplete.apply(_this, _this.awaitor_value); }, 0);
                else
                    setTimeout(function () { return oncomplete.call(_this, _this.awaitor_value); }, 0);
            }
            return this;
        };
        Awaitor.all = function (_awators) {
            var awaitors = is_array(_awators) ? _awators : arguments;
            return new Awaitor(function (resolve, reject) {
                var rs = [];
                var total = awaitors.length;
                var count = total;
                var hasError = false;
                for (var i = 0, j = total; i < j; i++) {
                    (function (index) {
                        var awaitObj = awaitors[index];
                        awaitObj.then(function (value) {
                            if (hasError)
                                return;
                            rs[index] = value;
                            if (--count == 0)
                                resolve(rs);
                        }, function (err) {
                            if (hasError)
                                return;
                            hasError = true;
                            var ex = new Exception("index=" + index + "\u7684Thenable\u9519\u8BEF\u5BFC\u81F4all\u51FD\u6570\u9519\u8BEF:" + err.message, err);
                            reject(ex);
                        });
                    })(i);
                }
                if (count == 0 && !hasError)
                    resolve(rs);
            });
        };
        Awaitor.race = function (_awators) {
            var awaitors = is_array(_awators) ? _awators : arguments;
            return new Awaitor(function (resolve, reject) {
                var hasResult = false;
                for (var i = 0, j = awaitors.length; i < j; i++) {
                    (function (index) {
                        var awaitObj = awaitors[index];
                        awaitObj.then(function (value) {
                            if (hasResult)
                                return;
                            hasResult = true;
                            resolve(value);
                        }, function (err) {
                            if (hasResult)
                                return;
                            hasResult = true;
                            reject(err);
                        });
                    })(i);
                }
            });
        };
        Awaitor.resolve = function (value) {
            return new Awaitor(function (resolve) { return resolve(value); });
        };
        Awaitor.reject = function (err) {
            return new Awaitor(function (resolve, reject) { return reject(err); });
        };
        return Awaitor;
    }());
    YA.Awaitor = Awaitor;
    try {
        if (!window.Promise)
            window.Promise = Awaitor;
    }
    catch (_a) { }
    /*=========================================================
     * 数据处理相关类

     *========================================================*/
    /**
     * 数据路径
     * 给定一个字符串，比如 A.B.C
     * 当调用getValue(obj)/setValue(obj,value)时，表示在obj.A.B.C上赋值
     * 支持正向下标的数组表达式，比如 A.B[0].C,
     * 还支持反向下标的数组表达式
     * @export
     * @class DPath
     */
    var lastRegx = /^-\d+$/;
    var DPath = /** @class */ (function () {
        //fromRoot:boolean;
        function DPath(pathOrValue, type) {
            var _this = this;
            if (type === "const") {
                this.getValue = function (d) { return pathOrValue; };
                this.setValue = function (d, v) {
                    console.warn("向一个const的DPath写入了值", _this, d, v);
                    return _this;
                };
                return;
            }
            else if (type === "dynamic") {
                this.getValue = function (d) { return pathOrValue(d); };
                this.setValue = function (d, v) {
                    pathOrValue(d, v);
                    return _this;
                };
                return;
            }
            var path = pathOrValue;
            //$.user.roles[0].permissions:first.id;
            var lastAt = -1;
            var lastTokenCode;
            var lastPropName;
            var isLastArr;
            var inBrace = false;
            var getterCodes = [];
            var setterCodes = ["var $current$;\n"];
            var buildCodes = function (txt, isArr) {
                if (isArr) {
                    getterCodes.push("$obj$=$obj$[" + txt + "];if(!$obj$===undefined)return $obj$;\n");
                }
                else {
                    getterCodes.push("$obj$=$obj$." + txt + ";if(!$obj$===undefined)return $obj$;\n");
                }
                if (lastPropName) {
                    if (isLastArr) {
                        setterCodes.push("$current$=$obj$[" + lastPropName + "];if(!$current$) $obj$=$obj$[" + lastPropName + "]=" + (isArr ? "[]" : "{}") + ";else $obj$=$current$;\n");
                    }
                    else {
                        setterCodes.push("$current$=$obj$." + lastPropName + ";if(!$current$) $obj$=$obj$." + lastPropName + "=" + (isArr ? "[]" : "{}") + ";else $obj$=$current$;\n");
                    }
                }
                isLastArr = isArr;
                lastPropName = txt;
            };
            var tpath = "";
            for (var at = 0, len = path.length; at < len; at++) {
                var ch = path.charCodeAt(at);
                // .
                if (ch === 46) {
                    if (inBrace)
                        throw new Error("Invalid DPath:" + path);
                    var txt_1 = path.substring(lastAt + 1, at).replace(YA.trimRegx, "");
                    if (txt_1 === "") {
                        if (lastPropName && lastTokenCode != 93)
                            throw new Error("Invalid DPath:" + path);
                        lastTokenCode = ch;
                        lastAt = at;
                        continue;
                    }
                    lastPropName = txt_1;
                    //if(txt==="$") this.fromRoot = true;
                    buildCodes(txt_1);
                    lastTokenCode = ch;
                    lastAt = at;
                    continue;
                }
                else if (ch === 91) {
                    if (inBrace)
                        throw new Error("Invalid DPath:" + path);
                    var txt_2 = path.substring(lastAt + 1, at).replace(YA.trimRegx, "");
                    if (txt_2 === "") {
                        if (!lastPropName || lastTokenCode !== 93)
                            throw new Error("Invalid DPath:" + path);
                        lastTokenCode = ch;
                        lastAt = at;
                        continue;
                    }
                    buildCodes(txt_2);
                    inBrace = true;
                    lastTokenCode = ch;
                    lastAt = at;
                    continue;
                }
                else if (ch === 93) {
                    if (!inBrace)
                        throw new Error("Invalid DPath:" + path);
                    var txt_3 = path.substring(lastAt + 1, at).replace(YA.trimRegx, "");
                    if (txt_3 === "")
                        throw new Error("Invalid DPath:" + path);
                    var match = txt_3.match(lastRegx);
                    if (match) {
                        txt_3 = "$obj$.length-1" + match;
                    }
                    buildCodes(txt_3, true);
                    inBrace = false;
                    lastTokenCode = ch;
                    lastAt = at;
                    continue;
                }
            }
            if (inBrace)
                throw new Error("Invalid DPath:" + path);
            var txt = path.substr(lastAt + 1).replace(YA.trimRegx, "");
            if (txt) {
                getterCodes.push("return $obj$." + txt + ";\n");
                if (lastPropName) {
                    if (isLastArr) {
                        setterCodes.push("$current$=$obj$[" + lastPropName + "];if(!$current$) $obj$=$obj$[" + lastPropName + "]={};else $obj$=$current$;\n");
                    }
                    else {
                        setterCodes.push("$current$=$obj$." + lastPropName + ";if(!$current$) $obj$=$obj$." + lastPropName + "={};else $obj$=$current$;\n");
                    }
                }
                setterCodes.push("$obj$." + txt + "=$value$;\nreturn this;\n");
            }
            else {
                getterCodes.pop();
                getterCodes.push("return $obj$[" + lastPropName + "];");
                if (isLastArr) {
                    setterCodes.push("$obj$[" + lastPropName + "]=$value$;\nreturn this;\n");
                }
                else {
                    setterCodes.push("$obj$." + lastPropName + "=$value$;\nreturn this;\n");
                }
            }
            var getterCode = getterCodes.join("");
            var setterCode = setterCodes.join("");
            this.getValue = new Function("$obj$", getterCode);
            this.setValue = new Function("$obj$", "$value$", setterCode);
        }
        DPath.prototype.getValue = function (data) { };
        DPath.prototype.setValue = function (data, value) {
            return this;
        };
        DPath.fetch = function (pathtext) {
            return DPaths[pathtext] || (DPaths[pathtext] = new DPath(pathtext));
        };
        DPath.const = function (value) {
            return new DPath(value, "const");
        };
        DPath.dymanic = function (value) {
            return new DPath(value, "dynamic");
        };
        return DPath;
    }());
    YA.DPath = DPath;
    var DPaths = DPath.paths = {};
    DPaths[""] = {
        getValue: function (data) { return data; },
        setValue: function (data, value) { }
    };
    var branceRegx = /\{([^\}]+)\}/gi;
    /**
     * a={dd}&b={d.s({a,b})}
     *
     * @export
     * @class StringTemplate
     */
    var StringTemplate = /** @class */ (function () {
        function StringTemplate(template) {
            this.text = template;
            var match;
            var lastAt = 0;
            while (match = branceRegx.exec(template)) {
                var at = match.index;
                var text_1 = template.substring(lastAt, at);
                if (text_1)
                    this.dpaths.push(text_1);
                at++;
                var len = match.length;
                var pathtext = template.substr(at, len);
                var dpath = DPath.fetch(pathtext);
                this.dpaths.push(dpath);
                lastAt = at + len + 1;
            }
            var text = template.substring(lastAt);
            if (text)
                this.dpaths.push(text);
        }
        StringTemplate.prototype.replace = function (data, convertor) {
            var rs = "";
            for (var i in this.dpaths) {
                var dp = this.dpaths[i];
                if (dp.getValue) {
                    var val = dp.getValue(data);
                    if (convertor)
                        val = convertor(val);
                    if (val !== null && val !== undefined) {
                        rs += val;
                    }
                }
                else
                    rs += dp;
            }
            return rs;
        };
        StringTemplate.replace = function (template, data, convertor) {
            var tmpl = StringTemplate.caches[template] || (StringTemplate.caches[template] = new StringTemplate(template));
            return tmpl.replace(data);
        };
        StringTemplate.caches = {};
        return StringTemplate;
    }());
    YA.StringTemplate = StringTemplate;
    /**
     * 资源/模块状态
     *
     * @export
     * @enum {number}
     */
    var ResourceStates;
    (function (ResourceStates) {
        /**
         * 被请求
         */
        ResourceStates[ResourceStates["required"] = 0] = "required";
        /**
         * 正在从 网站/本地或其他资源地址加载，但尚未完全返回。
         */
        ResourceStates[ResourceStates["loading"] = 1] = "loading";
        /**
         * 已经从资源地址中载入，还在处理依赖关系
         */
        ResourceStates[ResourceStates["waiting"] = 2] = "waiting";
        /**
         * 所有依赖项已加载完成，但模块还在初始化中
         */
        ResourceStates[ResourceStates["initializing"] = 3] = "initializing";
        /**
         * 模块已经完全载入，包括依赖项与内置资源
         */
        ResourceStates[ResourceStates["completed"] = 4] = "completed";
        ResourceStates[ResourceStates["error"] = -1] = "error";
    })(ResourceStates = YA.ResourceStates || (YA.ResourceStates = {}));
    var Resource = /** @class */ (function (_super) {
        __extends(Resource, _super);
        function Resource(opts) {
            var _this = this;
            if (opts.url === "%__LOCALVALUE__%") {
                return;
            }
            _this = _super.call(this, function (resolve, reject) {
                _this._resolve = resolve;
                _this._reject = reject;
                _this._load();
            }) || this;
            var url = opts.url.replace(/(^\s+)|(\s+$)/gi, "");
            if (!url)
                throw new Error("未指定资源的URL.");
            _this.id = url;
            _this.type = opts.type || "js";
            _this.url = _this._makeUrl(url);
            return _this;
        }
        /**
         * 添加或删除模块状态监听函数
         * 如果返回false，则会从监听中把自己去掉。
         *
         * @param {(boolean|{(res:IResource):void})} addOrRemove
         * @param {(res:IResource)=>void} [callback]
         * @memberof IResource
         */
        Resource.prototype.statechange = function (addOrRemove, callback) {
            if (this.status == ResourceStates.completed || this.status == ResourceStates.error) {
                return this;
            }
            if (callback === undefined)
                callback = addOrRemove;
            if (addOrRemove === false) {
                for (var i = 0, j = this._statechangeCallbacks.length; i < j; i++) {
                    var existed = this._statechangeCallbacks.shift();
                    if (existed !== callback)
                        this._statechangeCallbacks.push(existed);
                }
                return this;
            }
            else {
                (this._statechangeCallbacks || (this._statechangeCallbacks = [])).push(callback);
                return this;
            }
        };
        Resource.prototype._makeUrl = function (url) {
            var ext = "." + this.type;
            if (url.lastIndexOf(ext) < 0)
                url += ext;
            return url;
        };
        Resource.prototype._changeState = function (status, reason) {
            var _this = this;
            if (this.status === ResourceStates.error || this.status === ResourceStates.completed) {
                throw new Error("\u5F53\u524D\u8D44\u6E90\u5DF2\u7ECF\u5904\u4E8E" + ResourceStates[this.status] + "\uFF0C\u4E0D\u80FD\u53D8\u66F4\u72B6\u6001");
            }
            if (status != ResourceStates.error && status < this.status) {
                throw new Error("\u72B6\u6001\u4E0D\u80FD\u4ECE" + ResourceStates[this.status] + "\u53D8\u66F4\u4E3A" + ResourceStates[status]);
            }
            this.status = status;
            this.reason = reason;
            if (this._statechangeCallbacks) {
                for (var i = 0, j = this._statechangeCallbacks.length; i < j; i++) {
                    this._statechangeCallbacks[i](this);
                }
            }
            if (this.status === ResourceStates.error || this.status === ResourceStates.completed) {
                if (this.status == ResourceStates.completed)
                    this._resolve(reason);
                else
                    this._reject(reason);
                this._statechangeCallbacks = undefined;
                this.statechange = function (addOrRemove, callback) {
                    console.warn("向已经完成或错误的资源追加状态监听函数");
                    return _this;
                };
            }
            return this;
        };
        Resource.prototype._load = function () {
            var _this = this;
            this._changeState(ResourceStates.loading);
            this.element = this._doLoad(function () { return _this._changeState(ResourceStates.completed); }, function (ex) { return _this._changeState(ResourceStates.error, ex); });
        };
        Resource.prototype._doLoad = function (okCallback, errCallback) {
            var script = document.createElement("script");
            script.type = "text/javascript";
            var reqId = this.request_id = Math.random().toPrecision(21);
            var url = this.url;
            if (url.indexOf("?") > 0)
                url += "&_=" + reqId;
            else
                url += "?_=" + reqId;
            script.src = url;
            this._attatchEvents(script, okCallback, errCallback);
            this._getResourceElementContainer().appendChild(script);
            return script;
        };
        Resource.prototype._attatchEvents = function (elem, okCallback, errCallback) {
            var _this = this;
            elem.onerror = function (e) { if (errCallback)
                errCallback(e); };
            if (elem.onreadystatechange !== undefined) {
                elem.onreadystatechange = function () {
                    if (elem.readyState == 4 || elem.readyState == "complete") {
                        if (okCallback)
                            okCallback(_this);
                    }
                };
            }
            else {
                elem.onload = function () { if (okCallback)
                    okCallback(_this); };
            }
        };
        Resource.prototype._getResourceElementContainer = function () {
            var heads = document.getElementsByTagName("head");
            var head;
            if (heads.length) {
                head = heads[0];
                this._getResourceElementContainer = function () { return head; };
                return head;
            }
            else
                return document.body;
        };
        return Resource;
    }(Awaitor));
    YA.Resource = Resource;
    var StylesheetResource = /** @class */ (function (_super) {
        __extends(StylesheetResource, _super);
        function StylesheetResource(opts) {
            return _super.call(this, opts) || this;
        }
        StylesheetResource.prototype._doLoad = function (okCallback, errCallback) {
            var elem = document.createElement("link");
            elem.type = "text/css";
            elem.rel = "stylesheet";
            var reqId = this.request_id = Math.random().toPrecision(21);
            var url = this.url;
            if (url.indexOf("?") > 0)
                url += "&_=" + reqId;
            else
                url += "?_=" + reqId;
            elem.href = url;
            this._attatchEvents(elem, okCallback, errCallback);
            this._getResourceElementContainer().appendChild(elem);
            return elem;
        };
        return StylesheetResource;
    }(Resource));
    YA.StylesheetResource = StylesheetResource;
    var Module = /** @class */ (function (_super) {
        __extends(Module, _super);
        function Module(opts, waitingDepsModuleList) {
            var _this = _super.call(this, opts) || this;
            _this.dependences = [];
            //"等待依赖项的模块列表"，用这个变量来监测循环依赖，如果某个模块的依赖项出现在该列表中，就表示需要加载等待中的模块，就是循环引用
            _this._waitingDepsModuleList = waitingDepsModuleList;
            return _this;
        }
        Module.prototype._load = function () {
            var _this = this;
            this._changeState(ResourceStates.loading);
            this.element = this._doLoad(function () { return _this._srcLoaded(); }, function (ex) { return _this._changeState(ResourceStates.error, ex); });
        };
        Module.prototype._tryChangeState = function (status, reason) {
            if (this.status === ResourceStates.error || this.status === ResourceStates.completed) {
                return this;
            }
            else {
                this._changeState(status, reason);
                return this;
            }
        };
        Module.prototype._srcLoaded = function () {
            var _this = this;
            this._changeState(ResourceStates.waiting);
            var defParams = currentDefineParams;
            currentDefineParams = undefined;
            if (defParams === undefined)
                return this;
            var depCount = defParams.dependences ? defParams.dependences.length : 0;
            var depReadyCount = 0;
            var depValues = [];
            var hasError = false;
            if (depCount > 0 && this._waitingDepsModuleList)
                this._waitingDepsModuleList.push(this);
            for (var i in defParams.dependences) {
                (function (index) {
                    var depModule = getModule(defParams.dependences[index], _this._waitingDepsModuleList);
                    _this.dependences[index] = depModule;
                    depModule.then(function (value) {
                        if (hasError)
                            return;
                        depValues[index] = value;
                        depReadyCount++;
                        if (depReadyCount == depCount)
                            _this._depsReady(defParams.defination, depValues);
                    }, function (err) {
                        if (hasError)
                            return;
                        hasError = true;
                        var ex = new Exception("\u6A21\u5757[" + _this.id + "]\u7684\u4F9D\u8D56\u9879[" + defParams.dependences[index] + "->" + depModule.id + "]\u65E0\u6CD5\u52A0\u8F7D:" + err.message, err);
                        _this._tryChangeState(ResourceStates.error, ex);
                    });
                })(i);
            }
            if (depReadyCount == depCount && !hasError)
                this._depsReady(defParams.defination, depValues);
        };
        Module.prototype._depsReady = function (definer, depValues) {
            var _this = this;
            this._removeMeFroWaitingDepModuleList();
            var rs = definer.apply({
                //await:(fn)=>this.await(fn),
                id: this.id,
                url: this.url
            }, depValues);
            if (rs && rs["#__REQUIRE_NOT_COMPLETE__#"]) {
                this._tryChangeState(ResourceStates.initializing, rs);
                rs.then(function (value) { return _this._tryChangeState(ResourceStates.completed, value); }, function (err) { return _this._tryChangeState(ResourceStates.error, err); });
            }
            else {
                this._tryChangeState(ResourceStates.completed, rs);
            }
        };
        /**
         * 把自己从“等待依赖项的模块列表”中移除
         *
         * @private
         * @memberof Module
         */
        Module.prototype._removeMeFroWaitingDepModuleList = function () {
            //加载的时候才会进入到这个if里面去
            //加载完成，把自己从正在加载的模块列表中移除
            if (this._waitingDepsModuleList) {
                for (var i = 0, j = this._waitingDepsModuleList.length; i < j; i++) {
                    var exist = this._waitingDepsModuleList.shift();
                    if (exist !== this)
                        this._waitingDepsModuleList.push(exist);
                }
                //当前模块不再引用“正在等待的模块列表”，可能其他模块还在引用
                this._waitingDepsModuleList = undefined;
            }
        };
        return Module;
    }(Resource));
    YA.Module = Module;
    YA.cachedModules = {};
    /**
     * 从缓存中获取模块，如果没有就新建一个并加到缓存中
     *
     * @param {string} url
     * @returns
     */
    function getModule(url, waitingModules) {
        var cached = YA.cachedModules[url];
        if (cached)
            return cached;
        return cached = YA.cachedModules[url] = new Module({ url: url, type: "js" }, waitingModules);
    }
    var currentDefineParams;
    var emptyArray = [];
    function define(depNames, definer) {
        if (definer === undefined && typeof depNames === "function") {
            definer = depNames;
            depNames = emptyArray;
        }
        currentDefineParams = { dependences: depNames, defination: definer };
    }
    YA.define = define;
    define.amd = true;
    try {
        window.define = define;
    }
    catch (_b) { }
    function require(depNames) {
        var t = typeof depNames;
        var deps;
        var isArrayCall = is_array(depNames);
        if (!isArrayCall) {
            depNames = arguments;
        }
        deps = [];
        for (var i = 0, j = depNames.length; i < j; i++) {
            deps.push(getModule(depNames[i]));
        }
        var ret = Awaitor.all(deps);
        //(ret as any).complete 
        return ret;
    }
    YA.require = require;
    require.await = function (asyncProcess) {
        var awaitor = new Awaitor(asyncProcess);
        awaitor["#__REQUIRE_NOT_COMPLETE__#"] = true;
        return awaitor;
    };
    var urlResolveRules = {};
    function resolveUrl(url, data) {
        url = data ? StringTemplate.replace(url, data, function (t) { return encodeURIComponent(t); }) : url;
        for (var name_1 in urlResolveRules) {
            var rule = urlResolveRules[name_1];
            var newUrl = url.replace(rule.partten, rule.replacement);
            if (newUrl !== url) {
                url = newUrl;
                break;
            }
        }
        return url;
    }
    YA.resolveUrl = resolveUrl;
    resolveUrl.config = function (rules) {
        for (var name_2 in rules) {
            var rule = {
                partten: new RegExp(name_2),
                replacement: rules[name_2]
            };
            urlResolveRules[name_2] = rule;
        }
    };
    ;
    var AjaxException = /** @class */ (function (_super) {
        __extends(AjaxException, _super);
        function AjaxException(instance) {
            var _this = _super.call(this, instance.http.statusText) || this;
            _this.instance = instance;
            _this.status = instance.http.status;
            _this.statusText = instance.http.statusText;
            _this.message = "\u7F51\u7EDC\u8BF7\u6C42\u6216\u670D\u52A1\u5668\u5F02\u5E38(" + _this.status + ")";
            return _this;
        }
        return AjaxException;
    }(Exception));
    YA.AjaxException = AjaxException;
    var Ajax = /** @class */ (function (_super) {
        __extends(Ajax, _super);
        function Ajax(opts) {
            var _this = _super.call(this, function (resolve, reject) {
                var http = _this._init_http(opts, resolve, reject);
                var sendDataType = typeof opts.data;
                var method = _this.method = (opts.method || "GET").toUpperCase();
                var sendData = _this._init_sendData(opts, sendDataType, method);
                var url = resolveUrl(opts.url, sendDataType == "object" ? opts.data : undefined);
                var hasQuest = (url.indexOf("?") >= 0);
                if (method !== "POST" && method !== "PUT") {
                    if (sendData) {
                        if (hasQuest)
                            url += "&" + sendData;
                        else {
                            url += "?" + sendData;
                            hasQuest = true;
                        }
                    }
                    if (!opts.cache) {
                        if (hasQuest)
                            url += "&_" + Math.random();
                        else
                            url += "?_" + Math.random();
                    }
                    _this.data = null;
                }
                else {
                    _this.data = sendData;
                }
                _this.url = url;
                _this.requestHeaders = opts.headers || {};
                Ajax.interceptors.request.execute(_this, [http]);
                http.open(_this.method, _this.url, true);
                _this._init_headers(_this.requestHeaders, http, opts.type, method);
                http.send(_this.data);
            }) || this;
            _this.opts = opts;
            return _this;
        }
        Ajax.prototype._init_http = function (opts, resolve, reject) {
            var http;
            if (window.XMLHttpRequest)
                http = new XMLHttpRequest();
            else {
                var ActiveObject = window.ActiveObject;
                if (ActiveObject) {
                    http = new ActiveObject("Msxml2.XMLHTTP");
                }
                else {
                    http = new ActiveObject("Microsoft.XMLHTTP");
                }
            }
            this._init_http_event(http, opts, resolve, reject);
            return http;
        };
        Ajax.prototype._init_http_event = function (http, opts, resolve, reject) {
            var _this = this;
            if (http.onreadystatechange !== undefined) {
                http.onreadystatechange = function () {
                    if (http.readyState == 4 || http.readyState == "complete") {
                        Ajax.interceptors.response.execute(_this, [resolve, reject]);
                    }
                };
            }
            else {
                http.onload = function () { return Ajax.interceptors.response.execute(_this, [resolve, reject]); };
                ;
            }
            http.onerror = function (ex) {
                console.error(ex);
                reject(ex);
            };
        };
        Ajax.prototype._init_sendData = function (opts, sendDataType, method) {
            var sendData = opts.data;
            if (sendData) {
                var sendDataNeedEncode = false;
                if (method === "POST" || method === "PUT") {
                    if (sendDataType === "object") {
                        if (opts.type === "json") {
                            sendData = JSON.stringify(sendData);
                        }
                        else {
                            sendDataNeedEncode = true;
                        }
                    }
                }
                else {
                    sendDataNeedEncode = true;
                }
                if (sendDataNeedEncode) {
                    var sendStr = "";
                    for (var n in sendData) {
                        if (sendStr)
                            sendStr += "&";
                        sendStr += encodeURIComponent(n);
                        sendStr += "=";
                        var sendValue = sendData[n];
                        if (sendValue !== null && sendValue == undefined) {
                            sendStr += encodeURIComponent(sendValue);
                        }
                    }
                    sendData = sendStr;
                }
            }
            return sendData;
        };
        Ajax.prototype._init_headers = function (headers, http, type, method) {
            var contentType;
            if (type === "json") {
                contentType = "text/json";
            }
            else if (type === "xml") {
                contentType = "text/json";
            }
            else if (method == "POST" || method == "PUT") {
                contentType = "application/x-www-form-urlencode";
            }
            http.setRequestHeader("Content-Type", contentType);
            if (headers) {
                for (var name_3 in headers) {
                    http.setRequestHeader(name_3, headers[name_3]);
                }
            }
        };
        Ajax.interceptors = {
            request: new Interceptor(),
            response: new Interceptor()
        };
        return Ajax;
    }(Awaitor));
    YA.Ajax = Ajax;
    Ajax.interceptors.response.intercept(function (next, resolve, reject) {
        var me = this;
        if (me.http.status !== 200) {
            var ex = new AjaxException(me);
            console.error(ex);
            reject(ex);
        }
        else {
            next.call(this, [resolve, reject]);
        }
    });
    Ajax.interceptors.response.intercept(function (next, resolve, reject) {
        var me = this;
        var result;
        try {
            result = this.http.responseText;
        }
        catch (ex) {
            console.error(ex);
            reject(ex);
            return;
        }
        resolve(result);
        return next.call(this, [resolve, reject]);
    });
    Ajax.interceptors.response.intercept(function (next, resolve, reject) {
        var me = this;
        var opts = me.opts;
        var result;
        if (opts.dataType === "json") {
            try {
                result = JSON.parse(this.http.responseText);
            }
            catch (ex) {
                console.error(ex);
                reject(ex);
                return;
            }
            resolve(result);
            return;
        }
        ;
        return next.call(this, [resolve, reject]);
    });
    Ajax.interceptors.response.intercept(function (next, resolve, reject) {
        var me = this;
        var opts = me.opts;
        var result;
        if (opts.dataType === "xml") {
            try {
                result = this.http.responseXML;
            }
            catch (ex) {
                console.error(ex);
                reject(ex);
                return;
            }
            resolve(result);
            return;
        }
        ;
        return next.call(this, [resolve, reject]);
    });
    function createElement(tag) {
        return document.createElement(tag);
    }
    YA.createElement = createElement;
    var element_wrapper = createElement("div");
    if (element_wrapper.addEventListener) {
        YA.attach = function (elem, eventId, listener) { return elem.addEventListener(eventId, listener, false); };
        YA.detech = function (elem, eventId, listener) { return elem.removeEventListener(eventId, listener, false); };
    }
    else if (element_wrapper.attachEvent) {
        YA.attach = function (elem, eventId, listener) { return elem.attachEvent('on' + eventId, listener); };
        YA.detech = function (elem, eventId, listener) { return elem.detechEvent('on' + eventId, listener); };
    }
    var emptyStringRegx = /\s+/g;
    function findClassAt(clsnames, cls) {
        var at = clsnames.indexOf(cls);
        var len = cls.length;
        while (at >= 0) {
            if (at > 0) {
                var prev = clsnames[at - 1];
                if (!emptyStringRegx.test(prev)) {
                    at = clsnames.indexOf(cls, at + len);
                    continue;
                }
            }
            if ((at + len) !== clsnames.length) {
                var next = clsnames[at + length];
                if (!emptyStringRegx.test(next)) {
                    at = clsnames.indexOf(cls, at + len);
                    continue;
                }
            }
            return at;
        }
        return at;
    }
    function hasClass(elem, cls) {
        return findClassAt(elem.className, cls) >= 0;
    }
    YA.hasClass = hasClass;
    function addClass(elem, cls) {
        if (findClassAt(elem.className, cls) >= 0)
            return false;
        elem.className += " " + cls;
        return true;
    }
    YA.addClass = addClass;
    function removeClass(elem, cls) {
        var clsnames = elem.className;
        var at = findClassAt(clsnames, cls);
        if (at <= 0)
            return false;
        var prev = clsnames.substring(0, at);
        var next = clsnames.substr(at + cls.length);
        elem.className = prev.replace(/(\s+$)/g, "") + " " + next.replace(/(^\s+)/g, "");
        return true;
    }
    YA.removeClass = removeClass;
    function replaceClass(elem, old_cls, new_cls, alwaysAdd) {
        var clsnames = elem.className;
        var at = findClassAt(clsnames, old_cls);
        if (at <= 0) {
            if (alwaysAdd)
                elem.className = clsnames + " " + new_cls;
            return false;
        }
        var prev = clsnames.substring(0, at);
        var next = clsnames.substr(at + old_cls.length);
        elem.className = prev + new_cls + next;
        return true;
    }
    YA.replaceClass = replaceClass;
    if (element_wrapper.currentStyle) {
        YA.getStyle = function (obj, attr) { return obj.currentStyle[attr]; };
    }
    else {
        YA.getStyle = function (obj, attr) {
            var f = false;
            return getComputedStyle(obj, f)[attr];
        };
    }
    var NullObject = /** @class */ (function () {
        function NullObject() {
        }
        return NullObject;
    }());
    ;
    var UndefinedObject = /** @class */ (function () {
        function UndefinedObject() {
        }
        return UndefinedObject;
    }());
    ;
    var ModelChangeTypes;
    (function (ModelChangeTypes) {
        ModelChangeTypes[ModelChangeTypes["value"] = 0] = "value";
        ModelChangeTypes[ModelChangeTypes["add"] = 1] = "add";
        ModelChangeTypes[ModelChangeTypes["remove"] = 2] = "remove";
    })(ModelChangeTypes = YA.ModelChangeTypes || (YA.ModelChangeTypes = {}));
    var Model = /** @class */ (function (_super) {
        __extends(Model, _super);
        function Model(name, target, superior) {
            var _this = _super.call(this) || this;
            _this.$target = target || {};
            _this.$name = name;
            _this.$superior = superior;
            return _this;
        }
        Model.prototype.get_value = function () {
            return this.$target[this.$name];
        };
        Model.prototype.find_member = function (name, sure) {
            var member = (this.$members || (this.$members = {}))[name];
            if (!member && sure) {
                var target = this.$target[this.$name] || (this.$target[this.$name] = {});
                member = this[name] = new Model(name, target, this);
            }
            return member;
        };
        Model.prototype.as_array = function () {
            var value = this.$target[this.$name];
            if (!is_array(value))
                value = this.$target[this.$name] = [];
            return this.$item_model = new Model("#index", value, this);
        };
        Model.prototype.update_model = function (value) {
            if (this.$item_model)
                return this._update_array(value);
            else if (this.$members)
                return this._update_object(value);
            else
                return this._update_value(value);
        };
        Model.prototype.clone_self = function (target) {
            if (!target) {
                if (this.$item_model)
                    target = [];
                else if (this.$members)
                    target = {};
            }
            var model = new Model(this.$name, target, this);
            var modelValue = model.get_value();
            if (this.$members)
                for (var n in this.$members) {
                    model[n] = model.$members[n] = this.$members[n].clone_self(modelValue);
                }
            if (this.$subscribers) {
                var subscribers = model.$subscribers = [];
                for (var i in this.$subscribers)
                    subscribers[i] = this.$subscribers[i];
            }
            return model;
        };
        Model.prototype._update_value = function (value) {
            var modelValue = this.$target[this.$name];
            if (modelValue !== value) {
                this.$target[this.$name] = value;
                this.publish({ target: this.$target, name: this.$name, value: value, type: ModelChangeTypes.value, sender: this });
            }
            return this;
        };
        Model.prototype._update_object = function (value) {
            var modelValue = this.$target[this.$name];
            if (value === null || value === undefined || typeof value !== "object") {
                modelValue.__YA_IS_NULL__ = true;
                for (var n in this.$members)
                    this.$members[n].update_model(undefined);
                return this;
            }
            ;
            for (var n in this.$members)
                this.$members[n].update_model(value[n]);
            return this;
        };
        Model.prototype._update_array = function (value) {
            var modelValue = this.$target[this.$name];
            //如果不是数组或设置为空了，就发送消息
            if (value === null || value === undefined || !is_array(value)) {
                modelValue.__YA_IS_NULL__ = true;
                this.publish({ target: this.$target, name: this.$name, value: value, type: ModelChangeTypes.value });
                return this;
            }
            ;
            var removed = [];
            for (var i = 0, j = value.length; i < j; i++) {
                var newValue = value[i];
                var itemModel = this.$members[i];
                if (itemModel)
                    itemModel.update_model(newValue);
                else {
                    itemModel = this.$members[i] = this.$item_model.clone_self(modelValue);
                }
            }
            for (var i = value.length, j = modelValue.length - 1; i <= j; j--) {
                var itemModel = this.$members[j];
                delete this.$members[j];
                var itemValue = modelValue.pop();
                itemModel.publish({ target: this.$target, name: this.$name, value: itemValue, type: ModelChangeTypes.remove, sender: itemModel });
            }
            return this;
        };
        return Model;
    }(Observable));
    YA.Model = Model;
    var MemberAccessorTargetType;
    (function (MemberAccessorTargetType) {
        MemberAccessorTargetType[MemberAccessorTargetType["current"] = 0] = "current";
        MemberAccessorTargetType[MemberAccessorTargetType["root"] = 1] = "root";
        MemberAccessorTargetType[MemberAccessorTargetType["context"] = 2] = "context";
    })(MemberAccessorTargetType = YA.MemberAccessorTargetType || (YA.MemberAccessorTargetType = {}));
    var VAttribute = /** @class */ (function () {
        function VAttribute(name, value, scope) {
            this.name = name;
            this.value = value;
        }
        VAttribute.prototype.parseSibind = function (valueText, scope) {
            var accessInfo = this.findMemberAccessor(valueText, scope);
            (this.dep_accessors || (this.dep_accessors = [])).push(accessInfo);
        };
        VAttribute.prototype.parseBibind = function (valueText, scope) {
            var accessInfo = this.findMemberAccessor(valueText, scope);
            (this.dep_accessors || (this.dep_accessors = [])).push(accessInfo);
        };
        VAttribute.prototype.findMemberAccessor = function (valueText, scope) {
            var dpathtexts = valueText.split(".");
            var first = dpathtexts.shift();
            var targetType = MemberAccessorTargetType.current;
            var get_model;
            var model;
            if (first === "$") {
                model = scope.root;
                targetType = MemberAccessorTargetType.root;
                get_model = function (context) { return context.model; };
            }
            else if (first[0] == "$") {
                model = scope.getVariable(first);
                if (!model)
                    throw new Exception("\u65E0\u6CD5\u5728\u4E0A\u4E0B\u6587\u627E\u5230\u53D8\u91CF:" + first);
                targetType = MemberAccessorTargetType.context;
                get_model = function (context) { return context.variable(first); };
            }
            else {
                model = scope.model;
                get_model = function (context) { return context.model; };
                dpathtexts.unshift(first);
            }
            for (var i in dpathtexts) {
                model = model.find_member(dpathtexts[i], true);
            }
            return {
                get_scope_model: get_model,
                dpath: DPath.fetch(dpathtexts.join(".")),
                targetType: targetType,
                value_model: model
            };
        };
        VAttribute.prototype.refreshView = function (relem, value) {
            var tag = relem.tagName;
            if (tag === "INPUT") {
                var type = relem.type;
                if (type === "radio") {
                }
                relem.value = value.toString();
            }
            else if (tag === "TEXTAREA") {
                relem.value = value.toString();
            }
            else if (tag === "SELECT") {
                var ops = relem.options;
                var noneOp = void 0;
                var noneIndex = 0;
                var selectedIndex = -1;
                for (var i = 0, j = ops.length; i < j; i++) {
                    var op = ops[i];
                    if (op.value == value) {
                        op.selected = true;
                        selectedIndex = i;
                        break;
                    }
                    if (op.value === "") {
                        noneOp = op;
                        noneIndex = i;
                    }
                }
                if (selectedIndex == -1 && noneOp) {
                    noneOp.selected = true;
                    selectedIndex = noneIndex;
                }
                relem.selectedIndex = selectedIndex;
                relem.value = value;
            }
        };
        /**
         * 单向绑定算法 model->view
         *
         * @param {HTMLElement} relem
         * @param {*} context
         * @returns
         * @memberof VAttribute
         */
        VAttribute.prototype.bind = function (relem, context) {
            var _this = this;
            var valueModel1;
            var valueModels = [];
            for (var i in this.dep_accessors) {
                var accessorInfo = this.dep_accessors[i];
                var scopeModel = accessorInfo.get_scope_model(context);
                var valueModel = accessorInfo.dpath.getValue(scopeModel);
                if (!valueModel1)
                    valueModel1 = valueModel;
                valueModel.subscribe(function (evt) { return _this.refreshView(relem, getModelValue()); });
                valueModels.push(valueModel);
            }
            var getModelValue;
            if (this.dep_accessors.length == 1) {
                getModelValue = function () { return _this.getModelValue(valueModel1.get_value()); };
            }
            else {
                getModelValue = function () {
                    var args = [];
                    for (var i in valueModels) {
                        args.push(valueModels[i].get_value());
                    }
                    return _this.getModelValue.apply(_this, args);
                };
            }
            return this;
        };
        return VAttribute;
    }());
    YA.VAttribute = VAttribute;
    var VScope = /** @class */ (function () {
        function VScope() {
        }
        VScope.prototype.getVariable = function (name) {
            var rs;
            if (this.variables) {
                if (rs = this.variables[name])
                    return rs;
            }
            if (this.parent)
                rs = this.parent.getVariable(name);
            return rs;
        };
        return VScope;
    }());
    YA.VScope = VScope;
    var VElement = /** @class */ (function () {
        function VElement(info) {
        }
        VElement.prototype.render = function (container) {
            var relem = document.createElement(this.tag);
            if (container)
                container.appendChild(relem);
            if (this.attrs) {
                for (var i in this.attrs) {
                    this.attrs[i].bind(relem, this);
                }
            }
            if (this.children) {
                for (var i in this.children) {
                    var child = this.children[i];
                    child.render(relem);
                }
            }
            return relem;
        };
        return VElement;
    }());
    YA.VElement = VElement;
    function createVElement(tag, attrs, children) {
        var info;
        if (typeof tag === "string") {
            info = {
                tag: tag, attrs: attrs, children: children
            };
        }
        else
            info = tag;
    }
    var View = /** @class */ (function () {
        function View(elem) {
        }
        return View;
    }());
    YA.View = View;
})(YA || (YA = {}));
