declare function define(depts,definer):void;
define(["lib/test/require/req-b","lib/test/require/req-c"],function(b,c){
    console.trace(`defining [${this.id}]`);
    b.method("req-a");
    console.log(`print c.variable in [${this.id}]:${c.variable}`);
    return {
        filename:"req-a.ts"
    };
});
console.trace(`[req-a]is loaded`);