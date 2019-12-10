declare function define(depts,definer):void;
define([],function(){
    console.trace(`defining [${this.id}]`);
    return {
        filename:"req-b.ts",
        variable:"I AM THE VALUE OF c.variable"
    };
});
console.trace(`req-c is loaded`);