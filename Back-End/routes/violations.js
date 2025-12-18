import express from 'express';
import Violation from '../models/Violation.js';
import Match from '../models/Match.js';

const router = express.Router();

// GET /api/violations - Get all violations with filters
router.get('/', async (req, res) => {
  try {
    const {
      matchId,
      platformId,
      status,
      type,
      search,
      limit,
      sort
    } = req.query;
    
    const query = {};
    
    if (matchId) {
      query.matchId = matchId;
    }
    
    if (platformId) {
      query.platformId = platformId;
    }
    
    if (status) {
      query.status = status;
    }
    
    if (type) {
      query.type = type;
    }
    
    if (search) {
      query.$or = [
        { url: { $regex: search, $options: 'i' } },
        { accountHandle: { $regex: search, $options: 'i' } }
      ];
    }
    
    const limitNum = limit ? parseInt(limit) : 100;
    const sortOrder = sort === 'asc' ? 1 : -1;
    
    const violations = await Violation.find(query)
      .populate('matchId', 'team1 team2 date time')
      .sort({ timeAdded: sortOrder })
      .limit(limitNum)
      .lean();
    
    res.json(violations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/violations/:id - Get single violation
router.get('/:id', async (req, res) => {
  try {
    const violation = await Violation.findById(req.params.id)
      .populate('matchId');
    
    if (!violation) {
      return res.status(404).json({ error: 'Violation not found' });
    }
    
    res.json(violation);
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid violation ID' });
    }
    res.status(500).json({ error: error.message });
  }
});

// POST /api/violations - Create new violation
router.post('/', async (req, res) => {
  try {
    const {
      matchId,
      platformId,
      status,
      type,
      url,
      accountHandle,
      views,
      timeAdded,
      blockedAt,
      stillActive,
      notes
    } = req.body;
    
    if (!matchId || !platformId || !type || !url) {
      return res.status(400).json({ 
        error: 'Missing required fields: matchId, platformId, type, url' 
      });
    }
    
    // Verify match exists
    const match = await Match.findById(matchId);
    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }
    
    const violation = new Violation({
      matchId,
      platformId,
      status: status || 'reported',
      statusBadge: status === 'removed' ? 'blocked' : (status || 'reported'),
      type,
      url,
      accountHandle,
      views: views || '0',
      timeAdded: timeAdded ? new Date(timeAdded) : new Date(),
      blockedAt: blockedAt ? new Date(blockedAt) : undefined,
      stillActive: stillActive || false,
      notes,
      statusHistory: [{
        status: status || 'reported',
        changedAt: new Date()
      }]
    });
    
    const savedViolation = await violation.save();
    const populated = await Violation.findById(savedViolation._id)
      .populate('matchId')
      .lean();
    
    res.status(201).json(populated);
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid match ID' });
    }
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/violations/:id - Update violation
router.put('/:id', async (req, res) => {
  try {
    const {
      status,
      type,
      url,
      accountHandle,
      views,
      timeAdded,
      blockedAt,
      stillActive,
      notes
    } = req.body;
    
    const violation = await Violation.findById(req.params.id);
    
    if (!violation) {
      return res.status(404).json({ error: 'Violation not found' });
    }
    
    // Update fields
    if (status !== undefined) violation.status = status;
    if (type !== undefined) violation.type = type;
    if (url !== undefined) violation.url = url;
    if (accountHandle !== undefined) violation.accountHandle = accountHandle;
    if (views !== undefined) violation.views = views;
    if (timeAdded !== undefined) violation.timeAdded = new Date(timeAdded);
    if (blockedAt !== undefined) violation.blockedAt = blockedAt ? new Date(blockedAt) : undefined;
    if (stillActive !== undefined) violation.stillActive = stillActive;
    if (notes !== undefined) violation.notes = notes;
    
    // Handle status change (status history is handled by pre-save middleware)
    if (status !== undefined && status !== violation.status) {
      if (!violation.statusHistory) {
        violation.statusHistory = [];
      }
      violation.statusHistory.push({
        status,
        changedAt: new Date()
      });
    }
    
    const updatedViolation = await violation.save();
    const populated = await Violation.findById(updatedViolation._id)
      .populate('matchId')
      .lean();
    
    res.json(populated);
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid violation ID' });
    }
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/violations/:id/status - Update violation status only
router.patch('/:id/status', async (req, res) => {
  try {
    const { status, blockedAt } = req.body;
    
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }
    
    const violation = await Violation.findById(req.params.id);
    
    if (!violation) {
      return res.status(404).json({ error: 'Violation not found' });
    }
    
    const oldStatus = violation.status;
    violation.status = status;
    
    if (status === 'blocked' || status === 'removed') {
      violation.blockedAt = blockedAt ? new Date(blockedAt) : new Date();
    } else if (status === 'active') {
      violation.blockedAt = undefined;
    }
    
    // Add to status history if changed
    if (status !== oldStatus) {
      if (!violation.statusHistory) {
        violation.statusHistory = [];
      }
      violation.statusHistory.push({
        status,
        changedAt: new Date()
      });
    }
    
    const updatedViolation = await violation.save();
    const populated = await Violation.findById(updatedViolation._id)
      .populate('matchId')
      .lean();
    
    res.json(populated);
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid violation ID' });
    }
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/violations/:id - Delete violation
router.delete('/:id', async (req, res) => {
  try {
    const violation = await Violation.findById(req.params.id);
    
    if (!violation) {
      return res.status(404).json({ error: 'Violation not found' });
    }
    
    await Violation.findByIdAndDelete(req.params.id);
    res.json({ message: 'Violation deleted' });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid violation ID' });
    }
    res.status(500).json({ error: error.message });
  }
});

export default router;


