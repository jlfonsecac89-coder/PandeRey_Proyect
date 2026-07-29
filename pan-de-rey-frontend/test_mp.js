const token = 'APP_USR-1719720669056002-072410-257a750d06cff251cc8a7d468e3510b3-3467677258';
fetch('https://api.mercadopago.com/v1/payments/170224874137', {
    headers: { Authorization: `Bearer ${token}` }
}).then(r => r.json()).then(data => {
    console.log(JSON.stringify(data, null, 2));
}).catch(console.error);
