const SkinAnalysis = require('../models/SkinAnalysis.js');
const CustomerAccount = require('../server.js').CustomerAccount;

const saveSkinAnalysis = async (req, res) => {
  try {
    const customerId = req.user.id;
    const customer = await CustomerAccount.findById(customerId);
    if (!customer) {
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
      customerName: `${customer.firstName} ${customer.lastName}`,
      email: customer.email,
      skinTone,
      undertone,
      skinHex,
      skinRgb: skinRgb || {},
      recommendedColors: recommendedColors || [],
      recommendedGownIds: recommendedGownIds || [],
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
    return res.status(500).json({ message: 'Failed to save skin analysis.' });
  }
};

const updateSkinAnalysisApplied = async (req, res) => {
  try {
    const { analysisId } = req.params;
    const { selectedColor } = req.body;

    const analysis = await SkinAnalysis.findById(analysisId);
    if (!analysis) {
      return res.status(404).json({ message: 'Analysis not found.' });
    }

    if (String(analysis.customerId) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    analysis.appliedToOrder = true;
    analysis.selectedColor = selectedColor || null;
    await analysis.save();

    return res.json({ message: 'Analysis updated.' });
  } catch (err) {
    console.error('updateSkinAnalysisApplied error:', err);
    return res.status(500).json({ message: 'Failed to update analysis.' });
  }
};

module.exports = {
  saveSkinAnalysis,
  updateSkinAnalysisApplied,
};
