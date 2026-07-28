const express = require('express');
const {
  saveSkinAnalysis,
  updateSkinAnalysisApplied,
  getAllSkinAnalyses,
} = require('../controllers/skinAnalysisController.js');
const { authenticateToken } = require('../server.js');

const router = express.Router();

router.post('/save', authenticateToken, saveSkinAnalysis);
router.put('/:analysisId/applied', authenticateToken, updateSkinAnalysisApplied);
router.get('/all', authenticateToken, getAllSkinAnalyses);

module.exports = router;

