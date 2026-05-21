const express = require('express');
const {
  saveSkinAnalysis,
  updateSkinAnalysisApplied,
} = require('../controllers/skinAnalysisController.js');
const { authenticateToken } = require('../server.js');

const router = express.Router();

router.post('/save', authenticateToken, saveSkinAnalysis);
router.put('/:analysisId/applied', authenticateToken, updateSkinAnalysisApplied);

module.exports = router;
