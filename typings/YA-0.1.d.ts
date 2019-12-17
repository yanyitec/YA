declare namespace YA {
    enum ExecutionModes {
        Devalopment = 0,
        Production = 1,
    }
    let executionMode: ExecutionModes;
    let intRegx: RegExp;
    let numberRegx: RegExp;
    let percentRegx: RegExp;
    let quoteRegx: RegExp;
    function ajax<T>(opts: IAjaxOpts): IThenable<T>;
    /**
     * 去掉字符串两边的空白
     *
     * @export
     * @param {string} txt
     * @returns
     */
    function trim(txt: string): string;
    /**
     * 判断参数是否是数组
     *
     * @export
     * @param {*} obj
     * @returns
     */
    function isObject(obj: any): boolean;
    /**
     * 函数代理，固定某个函数的this到指定的对象
     *
     * @export
     * @param {Function} func 要固定this的函数
     * @param {object} self this指向的对象
     * @param {number} [argc] (optional)函数有几个参数,不填写表示任意多参数
     * @returns 固定了this指针的函数
     */
    function delegate(func: Function, self: object, argc?: number): Function;
    /**
     * 函数簇执行上下文，可以作为函数簇add/remove的参数
     *
     * @export
     * @interface IFuncExecuteArgs
     */
    interface IFuncExecuteArgs {
        handler: (...args: any[]) => any;
        [name: string]: any;
        args?: any[] | boolean;
        self?: object;
        arg0?: any;
        arg1?: any;
    }
    /**
     * 函数簇
     * 自己也是一个函数
     * 调用这个函数会依次调用add 的函数
     *
     * @export
     * @interface IFuncs
     */
    interface IFuncs {
        (...args: any[]): any;
        add(handler: Function | IFuncExecuteArgs): any;
        remove(handler: any): any;
    }
    /**
     * 创建函数簇
     *
     * @export
     * @param {number} [argc] (optional)函数参数个数，undefined表示任意多个
     * @param {(handler:any)=>Function} [ck] (optional)执行前检查函数，可以没有，表示所有的都执行；如果指定了该参数，在执行函数前会首先调用该函数，如果返回false表示未通过检查，不会执行
     * @param {(obj1:any,obj2:any)=>boolean} [eq] (optional) 等值检查函数。如果指定了，remove时会调用该函数来代替 ==
     * @returns {IFuncs}
     */
    function createFuncs(argc?: number, ck?: (handler: any) => Function, eq?: (obj1: any, obj2: any) => boolean): IFuncs;
    function extend(...args: any[]): any;
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
    function merge(dest: any, src: any, prop?: string, refs?: Array<any>): any;
    function deepClone(obj: any): any;
    interface IAccessor {
        getValue(): any;
        setValue(value: any): any;
    }
    interface IRange {
        min?: any;
        max?: any;
    }
    function xable(injectTaget: Function | object, Xable: Function): void;
    interface IEventHandler {
        (sender: any, eventArgs: IEventArgs): any;
    }
    interface IEventArgs {
        [key: string]: any;
        type?: string;
        src?: any;
        canceled?: boolean;
    }
    interface IEventCapture {
        handler: IEventHandler;
        raw: IEventHandler;
        capture: object;
    }
    function isInview(element: HTMLElement): boolean;
    enum Permissions {
        /**
         * 可读写
         */
        Writable = 0,
        /**
         * 只读
         */
        Readonly = 1,
        /**
        * 隐藏
         */
        Hidden = 2,
        /**
         * 禁止访问
         */
        Denied = 3,
    }
    enum ViewTypes {
        Detail = 0,
        Edit = 1,
        List = 2,
        Query = 3,
    }
    enum QueryTypes {
        Equal = 0,
        GreaterThan = 1,
        GreaterThanOrEqual = 2,
        LessThan = 3,
        LessThanOrEqual = 4,
        Range = 5,
    }
    interface IFieldset {
        basePath?: string;
        TEXT(text: string): string;
    }
    interface IFieldOpts {
        /**
         * 字段名
         *
         * @type {string}
         * @memberof IFieldOpts
         */
        name?: string;
        constValue?: any;
        /**
         * 类型
         *
         * @type {string}
         * @memberof IFieldOpts
         */
        type?: string;
        /**
         * 是否是主键
         *
         * @type {boolean}
         * @memberof IFieldOpts
         */
        isPrimary?: boolean;
        /**
         *  在数据对象上的路径
         *
         * @type {IFieldPathsOpts|string}
         * @memberof IFieldOpts
         */
        dpath?: string;
        /**
         * 显示名
         *
         * @type {string}
         * @memberof IFieldOpts
         */
        label?: string;
        /**
         * 说明
         *
         * @type {string}
         * @memberof IField
         */
        remark?: string;
        validations?: {
            [name: string]: any;
        };
        permission?: Permissions | string;
        queryable?: QueryTypes | string;
        group?: string;
    }
    interface IDropdownFieldOpts extends IFieldOpts {
        itemKey?: string;
        itemText?: string;
        noSelectedText?: string;
        isObjectValue?: boolean;
        items?: any;
    }
    interface IInternalFieldsetOpts {
        name: string;
        fields: Field[];
        viewType: ViewTypes;
        url: string;
        dpath: DPath;
        filter_dpath: DPath;
        rows_dpath: DPath;
        total_dpath: DPath;
        pageIndex_dpath: DPath;
        pageSize_dpath: DPath;
    }
    interface IFieldsetOpts {
        fields?: IFieldOpts[] | {
            [fieldname: string]: any;
        };
        views: {
            [name: string]: IFieldsetOpts;
        };
        viewType?: ViewTypes | string;
        url?: string;
        dpath?: string;
        rows_bas_dpath?: string;
        filter_bas_dpath?: string;
        pageSize_dpath?: string;
        pageIndex_dpath?: string;
    }
    class Fieldset {
        opts: IFieldsetOpts;
        private _viewOpts;
        constructor(opts: IFieldsetOpts);
        createView(name?: any, initData?: any, perms?: {
            [fname: string]: string;
        }): FieldsetView;
    }
    class FieldsetView {
        private opts;
        viewType: ViewTypes;
        columns: Field[];
        /**
         * 各域的权限，该参数一般来自初始化后获取数据时服务器端带过来
         *
         * @type {{[fname:string]:string}}
         * @memberof FieldsetView
         */
        permissions: {
            [fname: string]: string;
        };
        data: any;
        element: HTMLElement;
        views: {
            [name: string]: FieldView;
        };
        rows: Array<{
            [name: string]: FieldView;
        }>;
        groups: {
            [name: string]: IGroup;
        };
        constructor(opts: IInternalFieldsetOpts, initData: any, perms: {
            [fname: string]: string;
        });
        render(wrapper?: HTMLElement): HTMLElement;
        validate(isCheckRequired?: boolean): {
            [name: string]: ValidateMessage;
        };
        _renderExpandFields(wrapper: HTMLElement, viewType: ViewTypes): HTMLElement;
        _renderQuery(wrapper?: HTMLElement): HTMLElement;
        _renderTable(): HTMLElement;
        _renderHead(): HTMLElement;
        _renderBody(): HTMLElement;
        _renderFoot(): HTMLElement;
        TEXT(text: string): string;
    }
    interface IGroup {
        name: string;
        element: HTMLElement;
        legend: HTMLElement;
        content: HTMLElement;
        views?: {
            [name: string]: FieldView;
        };
    }
    let makeGroup: (groupName: string, fsView: FieldsetView) => IGroup;
    class Field {
        opts: IFieldOpts;
        name: string;
        type: string;
        dpath: DPath;
        label: string;
        validations: {
            [name: string]: any;
        };
        required: boolean;
        fieldset: Fieldset;
        permission: Permissions;
        className: string;
        group: string;
        queryable: QueryTypes;
        componentMaker: (field: FieldView, initValue: any, editable: boolean) => IFieldComponent;
        constructor(fieldOpts: IFieldOpts, fieldset?: Fieldset);
        validate(value: any, lng: (txt: string) => string, isCheckRequired: boolean): string;
    }
    interface IFieldComponent {
        element: HTMLElement;
        getViewValue: () => any;
        setViewValue: (value: any) => any;
    }
    class ValidateMessage {
        clientId: string;
        name: string;
        label: string;
        message: string;
        constructor(clientId: string, name: string, label: string, message: any);
        toString(html?: boolean): string;
    }
    let validators: {
        [name: string]: (value, opts, lng: (txt: string) => string) => string;
    };
    class FieldView {
        field: Field;
        fieldsetView: FieldsetView;
        data: any;
        inputClientId: string;
        element: HTMLElement;
        getViewValue: () => any;
        setViewValue: (val: any) => any;
        group?: IGroup;
        constructor(field: Field, fsv: FieldsetView, data: any);
        setValue(val: any, arg?: string): void;
        button(type: string): HTMLButtonElement;
        detail(): HTMLElement;
        edit(requireStar?: boolean): HTMLElement;
        filter(): HTMLElement;
        label(): HTMLLabelElement;
        cell(): HTMLElement;
        validate(isCheckRequired: boolean): ValidateMessage;
        _detailOrEdit(editable: boolean, requireStar: boolean): HTMLElement;
        _label(field: Field, requireMark: boolean): HTMLLabelElement;
        _remark(field: Field): HTMLLabelElement;
    }
}
