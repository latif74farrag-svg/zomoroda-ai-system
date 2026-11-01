const css = `
*{box-sizing:border-box}
body{font-family:"Cairo",system-ui,sans-serif!important;background:#f2f6f3!important;color:#17251f!important;max-width:1180px!important;padding:26px 20px!important;line-height:1.65}
h1{font-size:clamp(28px,4vw,40px);letter-spacing:-.03em;color:#123b2d;margin:10px 0 14px}
nav{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:0 0 22px;padding:13px 16px;background:#123b2d;border-radius:14px;box-shadow:0 8px 22px #123b2d16}
nav a{color:#e2f4e9!important;text-decoration:none;font-weight:750;padding:7px 10px;border-radius:8px}
nav a:hover{background:#ffffff1c}
#notice{position:sticky;z-index:5;top:10px;border:1px solid #d9e8dc;border-radius:12px;background:#fff;padding:12px 16px;box-shadow:0 5px 18px #173c2d0d}
section{background:#fff!important;border:1px solid #e0e8e2;border-radius:16px!important;padding:22px!important;margin:16px 0!important;box-shadow:0 8px 26px #183b2d08}
section h2{color:#174a36;margin:0 0 8px;font-size:21px}
section h3{color:#315441}
input,select,textarea{border:1px solid #cad8ce!important;border-radius:9px!important;background:#fff;padding:10px 12px!important;min-height:42px}
input:focus,select:focus,textarea:focus{outline:3px solid #bde4cd;border-color:#16744e!important}
button{font-weight:750!important;padding:9px 14px!important;border-radius:9px!important;transition:filter .15s,transform .15s}
button:hover:not(:disabled){filter:brightness(.94);transform:translateY(-1px)}
button:disabled{cursor:wait}
table{border-collapse:separate!important;border-spacing:0!important;overflow:hidden;border:1px solid #e2e9e4;border-radius:12px}
th{background:#edf5ef;color:#315441;font-weight:800}
td,th{text-align:right!important;padding:12px!important;border-bottom:1px solid #e7ede8!important}
tr:last-child td{border-bottom:0!important}
article{background:#fbfdfb;border:1px solid #e1e9e3!important;border-radius:12px!important;padding:16px!important;margin:10px 0!important;box-shadow:0 3px 10px #183b2d06}
pre{padding:13px;border-radius:10px;background:#f3f6f4;color:#31443a}
.scroll{border-radius:12px}
details summary{cursor:pointer;font-weight:800;color:#315441;padding:8px 0}
@media(max-width:640px){body{padding:14px 12px!important}section{padding:16px!important}nav{gap:4px;padding:10px}nav a{font-size:14px}table{min-width:560px}.scroll{overflow-x:auto}}
`;
module.exports = { css };
