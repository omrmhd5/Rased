import express from 'express';
import Platform from '../models/Platform.js';
import Violation from '../models/Violation.js';

const router = express.Router();

// GET /api/platforms - Get all platforms
router.get('/', async (req, res) => {
  try {
    const platforms = await Platform.find().sort({ name: 1 }).lean();
    res.json(platforms);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/platforms/:id - Get single platform
router.get('/:id', async (req, res) => {
  try {
    const platform = await Platform.findOne({ id: req.params.id });
    
    if (!platform) {
      return res.status(404).json({ error: 'Platform not found' });
    }
    
    res.json(platform);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/platforms - Create new platform
router.post('/', async (req, res) => {
  try {
    const { id, name, color, icon } = req.body;
    
    if (!id || !name || !color || !icon) {
      return res.status(400).json({ 
        error: 'Missing required fields: id, name, color, icon' 
      });
    }
    
    // Check if platform with this id already exists
    const existing = await Platform.findOne({ id: id.toLowerCase() });
    if (existing) {
      return res.status(400).json({ error: 'Platform with this ID already exists' });
    }
    
    const platform = new Platform({
      id: id.toLowerCase(),
      name,
      color,
      icon
    });
    
    const savedPlatform = await platform.save();
    res.status(201).json(savedPlatform);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Platform ID already exists' });
    }
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/platforms/:id - Update platform
router.put('/:id', async (req, res) => {
  try {
    const { name, color, icon } = req.body;
    
    const platform = await Platform.findOne({ id: req.params.id });
    
    if (!platform) {
      return res.status(404).json({ error: 'Platform not found' });
    }
    
    if (name !== undefined) platform.name = name;
    if (color !== undefined) platform.color = color;
    if (icon !== undefined) platform.icon = icon;
    
    const updatedPlatform = await platform.save();
    res.json(updatedPlatform);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/platforms/:id - Delete platform
router.delete('/:id', async (req, res) => {
  try {
    const platform = await Platform.findOne({ id: req.params.id });
    
    if (!platform) {
      return res.status(404).json({ error: 'Platform not found' });
    }
    
    // Check if platform has violations
    const violationCount = await Violation.countDocuments({ platformId: platform.id });
    if (violationCount > 0) {
      return res.status(400).json({ 
        error: `Cannot delete platform with ${violationCount} associated violations` 
      });
    }
    
    await Platform.findByIdAndDelete(platform._id);
    res.json({ message: 'Platform deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/platforms/:id/stats/:matchId - Get platform statistics for a match
router.get('/:id/stats/:matchId', async (req, res) => {
  try {
    const { id, matchId } = req.params;
    const { type } = req.query; // Optional: filter by content type
    
    const platform = await Platform.findOne({ id });
    
    if (!platform) {
      return res.status(404).json({ error: 'Platform not found' });
    }
    
    const query = { matchId, platformId: id };
    if (type && type !== 'all') {
      query.type = type.charAt(0).toUpperCase() + type.slice(1);
    }
    
    const violations = await Violation.find(query).lean();
    
    const totalViolations = violations.length;
    const activeViolations = violations.filter(v => 
      ['reported', 'active', 'pending', 'review'].includes(v.status)
    ).length;
    const blockedViolations = violations.filter(v => 
      v.status === 'blocked' || v.status === 'removed'
    ).length;
    const stillActive = violations.filter(v => v.stillActive).length;
    
    const totalViews = violations.reduce((sum, v) => {
      const views = parseFloat(v.views.replace('K', '')) * 1000;
      return sum + views;
    }, 0);
    
    const blockedRate = totalViolations > 0 
      ? Math.round((blockedViolations / totalViolations) * 100) 
      : 0;
    
    // Calculate average block time
    const blockedViolationsWithTime = violations.filter(v => 
      (v.status === 'blocked' || v.status === 'removed') && v.blockedAt
    );
    
    let avgBlockTime = 0;
    if (blockedViolationsWithTime.length > 0) {
      const totalBlockTime = blockedViolationsWithTime.reduce((sum, v) => {
        const timeAdded = new Date(v.timeAdded);
        const blockedAt = new Date(v.blockedAt);
        const diffMs = blockedAt - timeAdded;
        return sum + (diffMs / 60000); // Convert to minutes
      }, 0);
      avgBlockTime = totalBlockTime / blockedViolationsWithTime.length;
    }
    
    res.json({
      platform: {
        id: platform.id,
        name: platform.name,
        color: platform.color,
        icon: platform.icon
      },
      totalViolations,
      activeViolations,
      blockedCount: blockedViolations,
      blockedRate,
      totalViews: `${(totalViews / 1000).toFixed(1)}K`,
      avgBlockTime: `${avgBlockTime.toFixed(1)} min`,
      blockedSuccess: `${blockedRate}%`,
      stillActive
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid match ID' });
    }
    res.status(500).json({ error: error.message });
  }
});

export default router;




