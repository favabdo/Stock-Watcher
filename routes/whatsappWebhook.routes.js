const express = require('express');
const router = express.Router();
const whatsappWebhookController = require('../controllers/whatsappWebhookController');

// ملحوظة: الراوت ده متعمّد إنه من غير clientAuth/adminAuth، لأن ميتا هي اللي
// بتنادي عليه مباشرة (مش المستخدم من المتصفح)، والحماية بتتم عن طريق
// الـ Verify Token في الـ GET، وميتا مفيهاش طريقة تبعت Authorization header
// زي بتاعتنا.
router.get('/', whatsappWebhookController.verifyWebhook);
router.post('/', whatsappWebhookController.receiveEvent);

module.exports = router;
