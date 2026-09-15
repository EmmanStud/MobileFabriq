const SkinAnalysis = require('../models/SkinAnalysis.js');
const { CustomerAccount } = require('../server.js');

const saveSkinAnalysis = async (req, res) => {
  try {
    const customerId = req.user?.id || req.user?._id;
    console.log('[AI SAVE] handler: skinAnalysisController');
    console.log('[AI SAVE] auth role:', req.user?.role || 'missing');
    console.log('[AI SAVE] auth id present:', Boolean(customerId));
    console.log('[AI SAVE] auth email present:', Boolean(req.user?.email));
    if (!customerId) {
      return res.status(401).json({ message: 'Not authenticated.' });
    }

    const customer = await CustomerAccount.findById(customerId);
    console.log('[AI SAVE] CustomerAccount lookup by id:', customer ? 'FOUND' : 'NOT FOUND');
    if (!customer && req.user?.email) {
      const customerByEmail = await CustomerAccount.findOne({ email: String(req.user.email).trim().toLowerCase() });
      console.log('[AI SAVE] CustomerAccount lookup by email:', customerByEmail ? 'FOUND' : 'NOT FOUND');
    }
    if (!customer) {
      console.warn('[AI SAVE] customer lookup failed: JWT id did not resolve in customer_accounts');
      return res.status(404).json({ message: 'Customer not found.' });
    }

    const {
      skinTone,
      undertone,
      skinHex,
      skinRgb,
      recommendedColors,
      recommendedGownIds,
      insightText,
      branch,
    } = req.body;

    const analysis = new SkinAnalysis({
      customerId,
      customerName: `${customer.firstName || ''} ${customer.lastName || ''}`.trim()
        || customer.name
        || customer.email,
      email: customer.email,
      skinTone,
      undertone,
      skinHex: skinHex || '#000000',
      skinRgb: skinRgb || {},
      recommendedColors: recommendedColors || [],
      recommendedGownIds: (recommendedGownIds || []).filter(id => id && String(id).length === 24),
      insightText: insightText || null,
      branch: branch || null,
    });

    await analysis.save();

    return res.status(201).json({
      message: 'Skin analysis saved.',
      analysisId: analysis._id,
    });
  } catch (err) {
    console.error('saveSkinAnalysis error:', err);
    return res.status(500).json({ message: 'Failed to save skin analysis.', error: err.message });
  }
};

const updateSkinAnalysisApplied = async (req, res) => {
  try {
    const { analysisId } = req.params;
    const { selectedColor } = req.body;
    const customerId = req.user?.id || req.user?._id;

    const analysis = await SkinAnalysis.findById(analysisId);
    if (!analysis) {
      return res.status(404).json({ message: 'Analysis not found.' });
    }

    if (String(analysis.customerId) !== String(customerId)) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    analysis.appliedToOrder = true;
    analysis.selectedColor = selectedColor || null;
    await analysis.save();

    return res.json({ message: 'Analysis updated.' });
  } catch (err) {
    console.error('updateSkinAnalysisApplied error:', err);
    return res.status(500).json({ message: 'Failed to update analysis.', error: err.message });
  }
};

const getAllSkinAnalyses = async (req, res) => {
  try {
    const analyses = await SkinAnalysis
      .find({})
      .sort({ scannedAt: -1 })
      .limit(100)
      .lean();
    return res.json({ analyses, total: analyses.length });
  } catch (err) {
    console.error('getAllSkinAnalyses error:', err);
    return res.status(500).json({ message: 'Failed to fetch analyses.' });
  }
};

module.exports = {
  saveSkinAnalysis,
  updateSkinAnalysisApplied,
  getAllSkinAnalyses,
};
