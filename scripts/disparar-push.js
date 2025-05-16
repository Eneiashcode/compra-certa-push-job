import 'dotenv/config';
import admin from 'firebase-admin';
import fs from 'fs';

// 🔐 Carrega chave da service account
const serviceAccount = JSON.parse(fs.readFileSync('./serviceAccountKey.json', 'utf8'));

// 🔥 Inicializa Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

// 📆 Verifica se hoje é um dos dias estratégicos
function deveDispararHoje() {
  const hoje = new Date();
  const dia = hoje.getDate();
  const diaSemana = hoje.getDay(); // 0 = domingo, 6 = sábado

  const diasEspecificos = [29, 30, 31, 1, 5, 10];

  return diaSemana === 0 || diaSemana === 6 || diasEspecificos.includes(dia);
}

async function enviarPushParaTodos() {
  if (!deveDispararHoje()) {
    console.log('📅 Hoje não é dia de disparo. Encerrando.');
    return;
  }

  const tokensRef = db.collection('tokens_push');
  const snapshot = await tokensRef.get();

  if (snapshot.empty) {
    console.log('⚠️ Nenhum token encontrado.');
    return;
  }

  const mensagem = {
    notification: {
      title: '📌 Dica do Compra Certa',
      body: 'Atualize sua lista e aproveite ofertas neste fim de semana ou virada de mês!',
    },
  };

  const promises = [];

  snapshot.forEach((doc) => {
    const token = doc.data().token;
    if (token) {
      promises.push(
        admin.messaging().send({
          ...mensagem,
          token,
        })
      );
    }
  });

  try {
    await Promise.all(promises);
    console.log(`✅ Push enviado para ${promises.length} dispositivos.`);
  } catch (err) {
    console.error('❌ Erro ao enviar notificações:', err);
  }
}

enviarPushParaTodos();
