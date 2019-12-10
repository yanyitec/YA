var YA;
(function (YA) {
    var ExecutionModes;
    (function (ExecutionModes) {
        ExecutionModes[ExecutionModes["Devalopment"] = 0] = "Devalopment";
        ExecutionModes[ExecutionModes["Production"] = 1] = "Production";
    })(ExecutionModes = YA.ExecutionModes || (YA.ExecutionModes = {}));
    YA.executionMode = ExecutionModes.Devalopment;
    /*=========================================================
     * 常用正则表达式
     *========================================================*/
    // 正则:整数
    YA.intRegx = /^\s*(\+\-)?\d+\s*$/;
    // 正则: 数字，小数
    YA.numberRegx = /^\s*(\+\-)?\s*\d+(?:.\d+)\s*$/;
    // 正则: 百分比
    YA.percentRegx = /^\s*(\+\-)?\s*\d{1，2}(?:.\d+)\s*\%\s*$/;
    YA.quoteRegx = /"/gi;
    function ajax(opts) {
        return null;
    }
    YA.ajax = ajax;
    /*=========================================================
     * trim 函数
     *========================================================*/
    /**
     * 去掉字符串两边的空白
     *
     * @export
     * @param {string} txt
     * @returns
     */
    function trim(txt) {
        return txt ? txt.toString().replace(YA.trimRegx, "") : "";
    }
    YA.trim = trim;
    /**
     * 判断参数是否是数组
     *
     * @export
     * @param {*} obj
     * @returns
     */
    function isObject(obj) {
        return Object.prototype.toString.call(obj) === "[object Object]";
    }
    YA.isObject = isObject;
    /*=========================================================
     * 函数处理
     * 包含 固定this指针的delegate
     * 函数簇，多个类似的函数，调用时将依次调用里面的函数
     *========================================================*/
    /**
     * 函数代理，固定某个函数的this到指定的对象
     *
     * @export
     * @param {Function} func 要固定this的函数
     * @param {object} self this指向的对象
     * @param {number} [argc] (optional)函数有几个参数,不填写表示任意多参数
     * @returns 固定了this指针的函数
     */
    function delegate(func, self, argc) {
        if (argc === undefined)
            return function () { return func.apply(self, arguments); };
        if (argc === 0)
            return function () { return func.call(self); };
        if (argc === 1)
            return function (arg) { return func.call(self, arg); };
        var factory = delegateFactories[argc];
        if (!factory) {
            var argList = "";
            for (var i = 0, j = argc; i < j; i++) {
                if (argList)
                    argList += ",";
                argList += "arg" + i;
            }
            var code = "return function(" + argList + "){return func.call(self," + argList + ")}";
            factory = delegateFactories[argc] = new Function("func", "self", code);
        }
        return factory(func, self);
    }
    YA.delegate = delegate;
    var delegateFactories = [];
    /**
     * 创建函数簇
     *
     * @export
     * @param {number} [argc] (optional)函数参数个数，undefined表示任意多个
     * @param {(handler:any)=>Function} [ck] (optional)执行前检查函数，可以没有，表示所有的都执行；如果指定了该参数，在执行函数前会首先调用该函数，如果返回false表示未通过检查，不会执行
     * @param {(obj1:any,obj2:any)=>boolean} [eq] (optional) 等值检查函数。如果指定了，remove时会调用该函数来代替 ==
     * @returns {IFuncs}
     */
    function createFuncs(argc, ck, eq) {
        var factory = funcsFactories[argc || 0];
        if (!factory) {
            var argList = "";
            var isConst = false;
            if (argc === null) {
                isConst = true;
                argc = 24;
            }
            else if (argc >= 24)
                throw new Error("参数最多只能有23个");
            for (var i = 0, j = argc; i < j; i++) {
                if (argList)
                    argList += ",";
                argList += "arg" + i;
            }
            var code = "var handlers = [];\nvar funcs = function(" + argList + "){\n    var result;\n                \n    for(let i=0,j=handlers.length;i<j;i++){\n        var handler = handlers[i];\n        var rs;\n        if(ck){\n            handler = ck(handler);\n            if(!handler) continue;\n        }";
            if (isConst) {
                code += "\n        if(handler.handler){\n            if(handler.args){\n                if(handler.args===true){\n                    rs = handler.handler.call(handler.self||this,handler.arg0,handler.arg1);\n                }  else if(handler.args.length){\n                    rs = handler.handler.apply(hanlder.self||this,handler.args);\n                }\n            }\n              \n        }\n";
            }
            else {
                code += "\n        let rs = handler(" + argList + ");\n";
            }
            code += "\n        if(rs!==undefined){\n            result = rs;\n            if(rs===false)break;\n        }\n    }\n    return result;\n};\nfuncs.__YA_FUNCS_HANLDERS = handlers;\nfuncs.add=function(handler){handlers.push(handler);}\nfuncs.remove=function(handler){\n    for(var i=0,j=handlers.length;i<j;i++){\n        var existed = handlers.shift();\n        if(existed !==handler && (eq ?!eq(handler,existed):true)){continue;}\n    }\n}\nreturn funcs;\n";
            factory = funcsFactories[argc] = new Function("ck", "eq", code);
        }
        return factory(ck, eq);
    }
    YA.createFuncs = createFuncs;
    var funcsFactories = [];
    /*=========================================================
     * 数据处理相关类

     *========================================================*/
    function extend() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        var obj = arguments[0] || {};
        for (var i = 1, j = arguments.length; i < j; i++) {
            var src = arguments[i];
            for (var n in src)
                obj[n] = src[n];
        }
        return obj;
    }
    YA.extend = extend;
    /**
     * 对象合并
     *
     * @export
     * @param {*} dest 目标对象
     * @param {*} src 源对象
     * @param {string} [prop] 内部使用
     * @param {Array<any>} [refs] 内部使用，在循环引用时防止无穷循环
     * @returns
     */
    function merge(dest, src, prop, refs) {
        if (prop === undefined) {
            if (dest === src)
                return dest;
            for (var n in src)
                merge(dest, src, n, []);
            return dest;
        }
        var srcValue = src[prop];
        if (srcValue === null)
            return dest[prop] = null;
        if (srcValue instanceof RegExp)
            return dest[prop] = srcValue;
        var destValue = dest[prop];
        if (srcValue === undefined)
            return destValue;
        var srcValueType = typeof srcValue;
        if (srcValueType === "string" || srcValueType === "number" || srcValueType === "boolean") {
            return dest[prop] = srcValue;
        }
        for (var i in refs) {
            var ref = refs[i];
            if (ref.src === srcValue) {
                return dest[prop] = ref.target;
            }
        }
        var isSrcValueArray = Object.prototype.toString.call(srcValue) === "[object Array]";
        var target;
        if (!destValue)
            target = isSrcValueArray ? [] : {};
        if (!target) {
            if (typeof destValue !== 'object' || destValue instanceof RegExp)
                destValue = isSrcValueArray ? [] : {};
        }
        else
            target = destValue;
        refs.push({ src: srcValue, target: target });
        if (!target) {
            return dest[prop] = deepClone(srcValue);
        }
        else {
            merge(target, srcValue);
            return dest[prop] = target;
        }
    }
    YA.merge = merge;
    function deepClone(obj) {
        if (!obj)
            return obj;
        var type = typeof obj;
        if (type === "object") {
            var result = YA.is_array(obj) ? [] : {};
            for (var n in obj) {
                result[n] = deepClone(obj[n]);
            }
            return result;
        }
        return obj;
    }
    YA.deepClone = deepClone;
    /*=========================================================
     * 事件处理

     *========================================================*/
    function xable(injectTaget, Xable) {
        if (injectTaget) {
            var target = injectTaget;
            if (typeof injectTaget === "function")
                target = injectTaget.prototype;
            var src = Xable.prototype;
            for (var n in src) {
                target[n] = src[n];
            }
        }
    }
    YA.xable = xable;
    var Observable = /** @class */ (function () {
        function Observable(injectTaget) {
            if (injectTaget)
                xable(injectTaget, Observable);
        }
        Observable.prototype.subscribe = function (event, handler, capture) {
            var handlers = this.get_eventHandlers(event, true);
            handlers.add(capture ? { handler: handler, capture: this, src: handler } : handler);
            return this;
        };
        Observable.prototype.unsubscribe = function (event, handler, capture) {
            if (event === "<clear-all>") {
                this._eventMaps = undefined;
                return this;
            }
            var maps = this._eventMaps;
            if (maps) {
                var handlers = maps[event];
                if (handlers)
                    handlers.remove(capture ? { handler: handler, src: handler, capture: this } : handler);
            }
            return this;
        };
        Observable.prototype.notify = function (event, args) {
            var maps = this._eventMaps;
            if (maps) {
                var handlers = maps[event];
                if (handlers)
                    handlers.call(this, args);
            }
            return this;
        };
        Observable.prototype.get_eventHandlers = function (event, addIfNone) {
            var maps = this._eventMaps || (this._eventMaps = {});
            var handlers = maps[event];
            if (!handlers && addIfNone)
                maps[event] = handlers = createFuncs(2, function (handler) { return handler.handler || handler; }, function (e1, e2) { return e1 === e2 || (e1.capture === e2.capture && e1.raw == e2.raw); });
            return handlers;
        };
        return Observable;
    }());
    YA.Observable = Observable;
    /*=========================================================
     * 网页处理
     *========================================================*/
    function createElement(tagName) {
        return document.createElement(tagName);
    }
    YA.createElement = createElement;
    YA.getStyle = function (obj, attr) {
        if (obj.currentStyle) {
            YA.getStyle = YA.getStyle = function (obj, attr) { return obj.currentStyle[attr]; };
        }
        else {
            YA.getStyle = YA.getStyle = function (obj, attr) {
                var f = false;
                return getComputedStyle(obj, f)[attr];
            };
        }
        return YA.getStyle(obj, attr);
    };
    YA.attach = function (elem, event, handler) {
        if (elem.addEventListener) {
            YA.attach = YA.attach = function (elem, event, handler) { return elem.addEventListener(event, handler, false); };
        }
        else {
            YA.attach = YA.attach = function (elem, event, handler) { return elem.attachEvent("on" + event, handler); };
        }
        return YA.attach(elem, event, handler);
    };
    YA.detech = function (elem, event, handler) {
        if (elem.removeEventListener) {
            YA.detech = YA.detech = function (elem, event, handler) { return elem.removeEventListener(event, handler, false); };
        }
        else {
            YA.detech = YA.detech = function (elem, event, handler) { return elem.detechEvent("on" + event, handler); };
        }
        return YA.detech(elem, event, handler);
    };
    function replaceClass(element, addedCss, removeCss) {
        var clsText = element.className || "";
        var clsNames = element.classList || clsText.split(/\s+/g);
        var cs = [];
        for (var i = 0, j = clsNames.length; i < j; i++) {
            var clsn = clsNames[i];
            if (clsn === "" || clsn === addedCss || clsn === removeCss)
                continue;
            cs.push(clsn);
        }
        cs.push(addedCss);
        element.className = cs.join(" ");
    }
    YA.replaceClass = replaceClass;
    function isInview(element) {
        var doc = element.ownerDocument;
        while (element) {
            if (element === doc.body)
                return true;
            element = element.parentNode;
        }
        return false;
    }
    YA.isInview = isInview;
    var Permissions;
    (function (Permissions) {
        /**
         * 可读写
         */
        Permissions[Permissions["Writable"] = 0] = "Writable";
        /**
         * 只读
         */
        Permissions[Permissions["Readonly"] = 1] = "Readonly";
        /**
        * 隐藏
         */
        Permissions[Permissions["Hidden"] = 2] = "Hidden";
        /**
         * 禁止访问
         */
        Permissions[Permissions["Denied"] = 3] = "Denied";
    })(Permissions = YA.Permissions || (YA.Permissions = {}));
    var ViewTypes;
    (function (ViewTypes) {
        ViewTypes[ViewTypes["Detail"] = 0] = "Detail";
        ViewTypes[ViewTypes["Edit"] = 1] = "Edit";
        ViewTypes[ViewTypes["List"] = 2] = "List";
        ViewTypes[ViewTypes["Query"] = 3] = "Query";
    })(ViewTypes = YA.ViewTypes || (YA.ViewTypes = {}));
    var QueryTypes;
    (function (QueryTypes) {
        QueryTypes[QueryTypes["Equal"] = 0] = "Equal";
        QueryTypes[QueryTypes["GreaterThan"] = 1] = "GreaterThan";
        QueryTypes[QueryTypes["GreaterThanOrEqual"] = 2] = "GreaterThanOrEqual";
        QueryTypes[QueryTypes["LessThan"] = 3] = "LessThan";
        QueryTypes[QueryTypes["LessThanOrEqual"] = 4] = "LessThanOrEqual";
        QueryTypes[QueryTypes["Range"] = 5] = "Range";
    })(QueryTypes = YA.QueryTypes || (YA.QueryTypes = {}));
    var Fieldset = /** @class */ (function () {
        function Fieldset(opts) {
            this._viewOpts = {};
            this.opts = opts;
        }
        Fieldset.prototype.createView = function (name, initData, perms) {
            if (typeof name !== "string") {
                perms = initData;
                initData = name;
                name = "";
            }
            var viewOpts = this._viewOpts[name];
            if (!viewOpts) {
                var fsOpts = void 0;
                if (!name)
                    fsOpts = this.opts;
                else {
                    if (!this.opts.views)
                        throw new Error("未能在fieldsetOpts中找到view:" + name);
                    fsOpts = this.opts.views[name];
                }
                if (!fsOpts)
                    throw new Error("未能在fieldsetOpts中找到view:" + name);
                var fields = makeFields(this.opts.fields, fsOpts.fields);
                viewOpts = extend({}, fsOpts);
                viewOpts.fields = fields;
                if (typeof fsOpts.viewType === "string")
                    viewOpts.viewType = ViewTypes[fsOpts.viewType];
                if (viewOpts.viewType === undefined)
                    throw new Error("请指定viewType");
                viewOpts.dpath = YA.DPath.fetch(viewOpts.dpath || "");
                if (viewOpts.filter_dpath)
                    viewOpts.filter_dpath = YA.DPath.fetch(viewOpts.filter_dpath);
                viewOpts.rows_dpath = YA.DPath.fetch(viewOpts.rows_dpath || "");
                if (viewOpts.total_dpath)
                    viewOpts.total_dpath = YA.DPath.fetch(viewOpts.total_dpath);
                if (viewOpts.pageIndex_dpath)
                    viewOpts.pageIndex_dpath = YA.DPath.fetch(viewOpts.pageIndex_dpath);
                if (viewOpts.pageSize_dpath)
                    viewOpts.pageSize_dpath = YA.DPath.fetch(viewOpts.pageSize_dpath);
                this._viewOpts[name] = viewOpts;
            }
            return new FieldsetView(viewOpts, initData, perms);
        };
        return Fieldset;
    }());
    YA.Fieldset = Fieldset;
    function makeFields(entityFieldOpts, viewFieldOpts) {
        var rs = [];
        if (!viewFieldOpts) {
            for (var i = 0, j = entityFieldOpts.length; i < j; i++) {
                var field = new Field(entityFieldOpts[i], this);
                rs.push(field);
            }
        }
        else {
            var fieldOpts = void 0;
            var needClone = true;
            if (!YA.is_array(viewFieldOpts)) {
                fieldOpts = [];
                needClone = false;
                for (var fname in viewFieldOpts) {
                    var fvalue = viewFieldOpts[fname];
                    var fOpts = void 0;
                    if (typeof fvalue === "string") {
                        if (Permissions[fvalue] !== undefined) {
                            fOpts = {
                                name: fname,
                                permission: fvalue
                            };
                        }
                    }
                    else {
                        fOpts = fvalue;
                        if (!fOpts.name)
                            fOpts.name = fname;
                    }
                    fieldOpts.push(fOpts);
                }
            }
            else
                fieldOpts = viewFieldOpts;
            for (var i = 0, j = fieldOpts.length; i < j; i++) {
                var fieldOpt = needClone ? fieldOpts[i] : deepClone(fieldOpts[i]);
                for (var j_1 = 0, k = entityFieldOpts.length; j_1 < k; j_1++) {
                    var eFOpts = entityFieldOpts[j_1];
                    if (eFOpts.name === fieldOpt.name) {
                        fieldOpt = merge(fieldOpt, eFOpts);
                        break;
                    }
                }
                var field = new Field(fieldOpt, this);
                rs.push(field);
            }
        }
        return rs;
    }
    var FieldsetView = /** @class */ (function () {
        function FieldsetView(opts, initData, perms) {
            this.permissions = perms || {};
            this.opts = opts;
            this.data = merge({}, initData);
            this.viewType = opts.viewType;
        }
        FieldsetView.prototype.render = function (wrapper) {
            if (!wrapper)
                wrapper = this.element;
            else
                this.element = wrapper;
            if (!wrapper)
                this.element = wrapper = YA.createElement("div");
            else
                wrapper.innerHTML = "";
            switch (this.viewType) {
                case ViewTypes.Detail:
                    this._renderExpandFields(wrapper, ViewTypes.Detail);
                    break;
                case ViewTypes.Edit:
                    this._renderExpandFields(wrapper, ViewTypes.Edit);
                    break;
                case ViewTypes.Query:
                    this._renderQuery(wrapper);
                    break;
            }
            return wrapper;
        };
        FieldsetView.prototype.validate = function (isCheckRequired) {
            var rs = {};
            var count = 0;
            for (var n in this.views) {
                var fv = this.views[n];
                var vs = fv.validate(isCheckRequired);
                if (vs) {
                    rs[fv.field.name] = vs;
                    count++;
                }
            }
            return count ? rs : null;
        };
        FieldsetView.prototype._renderExpandFields = function (wrapper, viewType) {
            var _this = this;
            var opts = this.opts;
            var fields = opts.fields;
            var perms = this.permissions;
            var data = this.data;
            var groups = {};
            var groupCount = 0;
            var btns = [];
            for (var i = 0, j = fields.length; i < j; i++) {
                var field = fields[i];
                var perm = Permissions[perms[field.name]];
                if (perm === undefined)
                    perm = field.permission;
                if (perm === Permissions.Denied)
                    continue;
                if (!this.views)
                    this.views = {};
                var fview = this.views[field.name] = new FieldView(field, this, data);
                if (fview.field.type == "button" || fview.field.type == "submit") {
                    btns.push(fview.button(fview.field.type));
                    continue;
                }
                var groupName = field.opts.group || "";
                var group = groups[groupName];
                if (!group) {
                    group = YA.makeGroup(groupName, this);
                    groups[groupName] = group;
                    if (!group.views)
                        group.views = {};
                    group.content.innerHTML = "";
                    //wrapper.appendChild(group.element);
                    groupCount++;
                }
                this.views[field.name] = group.views[field.name] = fview;
                fview.group = group;
                var fieldElement = void 0;
                switch (viewType) {
                    case ViewTypes.Detail:
                        fieldElement = fview.detail();
                        break;
                    case ViewTypes.Edit:
                        if (perm === Permissions.Readonly)
                            fieldElement = fview.detail();
                        else
                            fieldElement = fview.edit();
                        break;
                    case ViewTypes.Query:
                        fieldElement = fview.filter();
                        break;
                    default: throw new Error("错误的调用");
                }
                if (perm == Permissions.Hidden)
                    fieldElement.style.display = "none";
                group.content.appendChild(fieldElement);
            }
            var form = YA.createElement("form");
            form.action = this.opts.url || "";
            if (viewType === ViewTypes.Query)
                form.method = "get";
            else
                form.method = "post";
            form.onsubmit = function (e) {
                e || (e = event);
                if (form.__validated)
                    return;
                var rs = _this.validate(viewType !== ViewTypes.Query);
                if (rs) {
                    var msgs = "<div>";
                    for (var n in rs)
                        msgs += rs[n].toString(true);
                    msgs += "</div>";
                    messageBox(msgs);
                }
                else {
                    ajax({
                        url: _this.opts.url,
                        nocache: true,
                        data: _this.data
                    });
                }
                e.cancelBubble = true;
                e.returnValue = false;
                if (e.preventDefault)
                    e.preventDefault();
                if (e.stopPropagation)
                    e.stopPropagation();
                return false;
            };
            if (groupCount) {
                if (groupCount == 1) {
                    for (var n in groups) {
                        form.appendChild(groups[n].content);
                    }
                }
                else {
                    for (var n in groups) {
                        form.appendChild(groups[n].element);
                    }
                }
            }
            else {
                this.groups = null;
            }
            if (btns.length) {
                var btnDiv = YA.createElement("span");
                btnDiv.className = "btns";
                for (var i = 0, j = btns.length; i < j; i++) {
                    btnDiv.appendChild(btns[i]);
                }
                form.appendChild(btnDiv);
            }
            wrapper.appendChild(form);
            return wrapper;
        };
        FieldsetView.prototype._renderQuery = function (wrapper) {
            if (!wrapper)
                wrapper = YA.createElement("div");
            var form = YA.createElement("form");
            form.className = "filter";
            var filter = this._renderExpandFields(form, ViewTypes.Query);
            form.appendChild(filter);
            wrapper.appendChild(form);
            wrapper.appendChild(this._renderTable());
            return wrapper;
        };
        FieldsetView.prototype._renderTable = function () {
            var tb = YA.createElement("table");
            tb.appendChild(this._renderHead());
            tb.appendChild(this._renderBody());
            tb.appendChild(this._renderFoot());
            return tb;
        };
        FieldsetView.prototype._renderHead = function () {
            var opts = this.opts;
            var fields = opts.fields;
            var perms = this.permissions;
            var thead = YA.createElement("thead");
            var tr = YA.createElement("tr");
            thead.appendChild(tr);
            this.columns = [];
            for (var i = 0, j = fields.length; i < j; i++) {
                var field = fields[i];
                var perm = Permissions[perms[field.name]];
                if (perm === undefined)
                    perm = field.permission;
                if (perm === Permissions.Denied)
                    continue;
                var th = YA.createElement("th");
                th.innerHTML = this.TEXT(field.label || field.name);
                tr.appendChild(th);
                this.columns.push(field);
            }
            return thead;
        };
        FieldsetView.prototype._renderBody = function () {
            var opts = this.opts;
            var fields = opts.fields;
            var perms = this.permissions;
            var tbody = YA.createElement("tbody");
            var rows = this.rows = [];
            var columns = this.columns;
            var rowDatas = this.opts.rows_dpath ? this.opts.rows_dpath.getValue(this.data) : this.data;
            if (!rowDatas || rowDatas.length === 0) {
                var tr = YA.createElement("tr");
                var td = YA.createElement("td");
                tr.appendChild(td);
                td.colSpan = this.columns.length;
                td.innerHTML = this.TEXT("没有数据");
            }
            for (var i = 0, j = rowDatas.lenght; i < j; i++) {
                var rowData = rowDatas[i];
                var row = {};
                var tr = YA.createElement("tr");
                for (var m = 0, n = columns.length; m < n; m++) {
                    var field = columns[m];
                    var fview = row[field.name] = new FieldView(field, this, rowData);
                    var td = YA.createElement("td");
                    td.appendChild(fview.cell());
                    tr.appendChild(td);
                }
                tbody.appendChild(tr);
            }
            return tbody;
        };
        FieldsetView.prototype._renderFoot = function () {
            var tfoot = YA.createElement("tfoot");
            var tr = YA.createElement("tr");
            tfoot.appendChild(tr);
            var td = YA.createElement("td");
            tr.appendChild(td);
            td.colSpan = this.columns.length;
            if (this.opts.pageSize_dpath) {
                var total = parseInt(this.opts.total_dpath.getValue(this.data)) || 0;
                var pageSize = parseInt(this.opts.pageSize_dpath.getValue(this.data)) || 5;
                var pageIndex = parseInt(this.opts.pageIndex_dpath.getValue(this.data)) || 1;
                if (pageIndex < 1)
                    pageIndex = 1;
                var pageCount = Math.ceil(total / pageSize);
                var scollIndex = Math.ceil(pageIndex / pageCount);
                var pForm = YA.createElement("form");
                if (scollIndex > 1) {
                    var prevScroll = YA.createElement("A");
                    prevScroll.innerHTML = "<<";
                    pForm.appendChild(prevScroll);
                }
                if (pageIndex > 1) {
                    var prevPage = YA.createElement("A");
                    prevPage.innerHTML = "<";
                    pForm.appendChild(prevPage);
                }
                var startPage = (pageIndex - 1) * pageSize;
                if (startPage == 0)
                    startPage = 1;
                var endPage = startPage + pageSize + 1;
                if (endPage > pageCount)
                    endPage = pageCount;
                for (var i = startPage; i <= endPage; i++) {
                    var pageA = YA.createElement("a");
                    pageA.innerHTML = i.toString();
                    if (i == pageIndex)
                        pageA.className = "current";
                    pForm.appendChild(pageA);
                }
                if (pageIndex < pageCount) {
                    var nextPage = YA.createElement("A");
                    nextPage.innerHTML = ">";
                    pForm.appendChild(nextPage);
                }
                if (endPage < pageCount) {
                    var nextScroll = YA.createElement("A");
                    nextScroll.innerHTML = ">>";
                    pForm.appendChild(nextScroll);
                }
                var logistic = YA.createElement("span");
                var totalStr = this.TEXT("共{0}条记录,每页<input type='text' value='{1}' name='pageSize' />,<input type='text' value='{2}' name='pageIndex' />/{3}页<input type='submit' value='跳转' />")
                    .replace("{0}", total.toString()).replace("{1}", pageSize.toString()).replace("{2}", pageIndex.toString()).replace("{3}", pageCount.toString());
                logistic.innerHTML = totalStr;
                pForm.appendChild(logistic);
                td.appendChild(pForm);
            }
            return tfoot;
        };
        FieldsetView.prototype.TEXT = function (text) {
            return text;
        };
        return FieldsetView;
    }());
    YA.FieldsetView = FieldsetView;
    YA.makeGroup = function makeGroup(groupName, fsView) {
        var gp = YA.createElement("fieldset");
        var legend = YA.createElement("legend");
        legend.innerHTML = fsView.TEXT(groupName);
        var content = YA.createElement("div");
        content.className = "group-content";
        gp.appendChild(legend);
        gp.appendChild(content);
        return {
            name: groupName,
            element: gp,
            legend: legend,
            content: content
        };
    };
    var Field = /** @class */ (function () {
        //dataViewCreator:(field:Field,fieldView:FieldView)=>IFieldViewAccessor;
        function Field(fieldOpts, fieldset) {
            this.opts = fieldOpts;
            this.fieldset = fieldset;
            this.type = fieldOpts.type || "text";
            this.name = fieldOpts.name;
            this.group = fieldOpts.group || "";
            this.queryable = typeof fieldOpts.queryable === "string" ? QueryTypes[fieldOpts.queryable] : fieldOpts.queryable;
            this.label = fieldOpts.label || this.name;
            this.validations = fieldOpts.validations || {};
            if (!this.validations[this.type]) {
                var validator = YA.validators[this.type];
                if (validator)
                    this.validations[this.type] = true;
            }
            this.required = this.validations.required;
            this.className = "field " + this.type + " " + this.name;
            this.dpath = YA.DPath.fetch(fieldOpts.dpath || this.name);
            this.permission = typeof fieldOpts.permission === "string" ? Permissions[fieldOpts.permission] : fieldOpts.permission;
            this.componentMaker = fieldComponents[this.type] || fieldComponents["text"];
            if (this.type === "button" || this.type == "submit")
                this.validate = function (value, lng, isc) { return undefined; };
        }
        Field.prototype.validate = function (value, lng, isCheckRequired) {
            var validRs;
            if (this.required && isCheckRequired) {
                var requireValid = YA.validators["required"];
                validRs = requireValid(value, true, lng);
                if (validRs)
                    return validRs;
            }
            var validations = this.validations;
            for (var validName in validations) {
                if (validName === "required")
                    continue;
                var validator = YA.validators[validName];
                if (!validator) {
                    if (YA.executionMode === ExecutionModes.Devalopment)
                        console.warn("找不到验证器", validName, this);
                    continue;
                }
                validRs = validator(value, validations[validName], lng);
                if (validRs)
                    return validRs;
            }
            return validRs;
        };
        return Field;
    }());
    YA.Field = Field;
    var ValidateMessage = /** @class */ (function () {
        function ValidateMessage(clientId, name, label, message) {
            this.name = name;
            this.clientId = clientId;
            this.label = label;
            this.message = message;
        }
        ValidateMessage.prototype.toString = function (html) {
            if (!html)
                return this.message;
            var str = "<div><label for=\"" + this.clientId + "\">" + this.label + "</label><span>" + this.message + "</span></div>";
            return str;
        };
        return ValidateMessage;
    }());
    YA.ValidateMessage = ValidateMessage;
    var requiredValidator = function (value, opts, lng) {
        var msg;
        if (isObject(opts))
            msg = opts.message;
        if (!value)
            return lng(msg || "必填");
        for (var n in value) {
            return;
        }
        return lng(msg || "必填");
    };
    YA.validators = {
        required: requiredValidator,
        length: function (value, opts, lng) {
            var min, max, message;
            if (isObject(opts)) {
                min = opts.min;
                max = opts.max;
                message = opts.message;
            }
            else
                max = parseInt(opts);
            if (!value) {
                if (min)
                    return message ? message.replace("{{min}}", min).replace("{{max}}", min) : lng("长度不能少于{{min}}个字符").replace("{min}", min);
            }
            var len = value.toString().replace(YA.trimRegx, "").length;
            if (min && len < min)
                return message ? message.replace("{{min}}", min).replace("{{max}}", min) : lng("长度不能少于{{min}}个字符").replace("{min}", min);
            if (max && len > max)
                return message ? message.replace("{{min}}", min).replace("{{max}}", min) : lng("长度不能超过{{max}}个字符").replace("{max}", max);
        },
        regex: function (value, opts, lng) {
            var reg, message, result;
            if (opts.match) {
                reg = opts;
                message = lng("格式不正确");
            }
            else {
                reg = opts.reg;
                message = lng(opts.message || "格式不正确");
            }
            if (!value)
                return;
            if (!reg.test(value.toString()))
                return message;
            return;
        },
    };
    var fieldComponents = {};
    fieldComponents.text = function (field, initValue, editable) {
        var elem;
        var getViewValue;
        var setViewValue;
        if (editable) {
            elem = YA.createElement("input");
            elem.type = "text";
            getViewValue = function () { return elem.value; };
            setViewValue = function (val) { elem.value = val === undefined || val === null ? "" : val; };
            var tick_1;
            var onblur_1 = function () {
                field.setValue(elem.value, "fromEvent");
            };
            var onhit = function () {
                if (tick_1) {
                    clearTimeout(tick_1);
                }
                tick_1 = setTimeout(onblur_1, 100);
            };
            YA.attach(elem, "keyup", onhit);
            YA.attach(elem, "keydown", onhit);
            YA.attach(elem, "blur", onblur_1);
        }
        else {
            elem = YA.createElement("span");
            getViewValue = function () { return elem.innerHTML; };
            setViewValue = function (val) { elem.innerHTML = val === undefined || val === null ? "" : val; };
        }
        setViewValue(initValue);
        return {
            element: elem,
            getViewValue: getViewValue,
            setViewValue: setViewValue
        };
    };
    var FieldView = /** @class */ (function () {
        function FieldView(field, fsv, data) {
            this.field = field;
            this.fieldsetView = fsv;
            this.data = data;
        }
        FieldView.prototype.setValue = function (val, arg) {
            this.field.dpath.setValue(this.data, val);
            if (arg === "fromEvent") {
                this.setViewValue(val);
            }
            this.validate(arg !== "notCheckRequired");
        };
        FieldView.prototype.button = function (type) {
            var wrapper = this.element;
            var field = this.field;
            if (wrapper)
                wrapper.innerHTML = wrapper.value = "";
            wrapper = this.element = YA.createElement("button");
            wrapper.type = type;
            wrapper.innerHTML = wrapper.value = this.fieldsetView.TEXT(this.field.label || this.field.name);
            this.setViewValue = function (value) { return wrapper.innerHTML = wrapper.value = value; };
            this.getViewValue = function () { return wrapper.value; };
            this.validate = function (isCheckRequired) { return undefined; };
            return wrapper;
        };
        FieldView.prototype.detail = function () {
            return this._detailOrEdit(false, false);
        };
        FieldView.prototype.edit = function (requireStar) {
            return this._detailOrEdit(true, true);
        };
        FieldView.prototype.filter = function () {
            return this._detailOrEdit(true, false);
        };
        FieldView.prototype.label = function () {
            return this._label(this.field, false);
        };
        FieldView.prototype.cell = function () {
            var wrapper = this.element;
            var field = this.field;
            if (wrapper)
                wrapper.innerHTML = "";
            wrapper = this.element = YA.createElement("div");
            var fieldWrapper = YA.createElement("div");
            fieldWrapper.className = field.className;
            var inputComp = field.componentMaker(this, field.dpath.getValue(this.data), false);
            inputComp.element.className = "field-input";
            fieldWrapper.appendChild(inputComp.element);
            this.getViewValue = inputComp.getViewValue;
            this.setViewValue = inputComp.setViewValue;
            return wrapper;
        };
        FieldView.prototype.validate = function (isCheckRequired) {
            var _this = this;
            var value = this.getViewValue();
            var result = this.field.validate(value, function (t) { return _this.fieldsetView.TEXT(t); }, isCheckRequired);
            if (result) {
                replaceClass(this.element, "validate-error", "validate-success");
                return new ValidateMessage(this.inputClientId, this.field.name, this.fieldsetView.TEXT(this.field.label || this.field.name), result);
            }
            else {
                replaceClass(this.element, "validate-success", "validate-error");
            }
            //return result;
        };
        FieldView.prototype._detailOrEdit = function (editable, requireStar) {
            var fieldWrapper = this.element;
            var field = this.field;
            if (fieldWrapper)
                fieldWrapper.innerHTML = "";
            fieldWrapper = this.element = YA.createElement("div");
            fieldWrapper.className = field.className;
            fieldWrapper.appendChild(this._label(field, requireStar));
            var inputComp = field.componentMaker(this, field.dpath.getValue(this.data), editable);
            inputComp.element.className = "field-input";
            fieldWrapper.appendChild(inputComp.element);
            this.getViewValue = inputComp.getViewValue;
            this.setViewValue = inputComp.setViewValue;
            if (field.opts.remark)
                fieldWrapper.appendChild(this._remark(field));
            return fieldWrapper;
        };
        FieldView.prototype._label = function (field, requireMark) {
            var labelElem = YA.createElement("label");
            labelElem.className = "field-label";
            labelElem.innerHTML = this.fieldsetView.TEXT(field.label || field.name);
            if (field.required && requireMark) {
                var requireMark_1 = YA.createElement("ins");
                requireMark_1.className = "required";
                requireMark_1.innerHTML = "*";
                labelElem.appendChild(requireMark_1);
            }
            labelElem.htmlFor = "";
            return labelElem;
        };
        FieldView.prototype._remark = function (field) {
            var labelElem = YA.createElement("label");
            labelElem.className = "field-remark";
            labelElem.innerHTML = this.fieldsetView.TEXT(field.opts.remark);
            return labelElem;
        };
        return FieldView;
    }());
    YA.FieldView = FieldView;
    function messageBox(msg) {
        return new YA.Awaitor(function (ok, fail) {
            alert(msg);
            ok(true);
        });
    }
})(YA || (YA = {}));
