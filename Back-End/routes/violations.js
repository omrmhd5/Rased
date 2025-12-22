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
      query.contentType = type;
    }
    
    if (search) {
      query.$or = [
        { violationUrl: { $regex: search, $options: 'i' } },
        { accountChannel: { $regex: search, $options: 'i' } }
      ];
    }
    
    const limitNum = limit ? parseInt(limit) : 100;
    const sortOrder = sort === 'asc' ? 1 : -1;
    
    const violations = await Violation.find(query)
      .populate('matchId', 'team1 team2 date time week competition stadium')
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
      matchName,
      platformId,
      platformName,
      violationUrl,
      accountChannel,
      contentType,
      status,
      views,
      timeAdded,
      active,
      notes
    } = req.body;
    
    // Required fields validation
    if (!matchId || !matchName || !platformId || !platformName || !violationUrl || !accountChannel || !contentType) {
      return res.status(400).json({ 
        error: 'Missing required fields: matchId, matchName, platformId, platformName, violationUrl, accountChannel, contentType' 
      });
    }
    
    // Verify match exists
    const match = await Match.findById(matchId);
    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }
    
    // Convert notes to array if it's a string
    let notesArray = [];
    if (notes) {
      if (typeof notes === 'string') {
        notesArray = notes.trim() ? [notes.trim()] : [];
      } else if (Array.isArray(notes)) {
        notesArray = notes.filter(n => n && n.trim());
      }
    }
    
    const violation = new Violation({
      matchId,
      matchName,
      platformId,
      platformName,
      violationUrl,
      accountChannel,
      contentType,
      status: status || 'active',
      views: views || undefined,
      timeAdded: timeAdded ? new Date(timeAdded) : new Date(),
      active: active !== undefined ? active : true,
      notes: notesArray,
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
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/violations/:id - Update violation
router.put('/:id', async (req, res) => {
  try {
    const {
      matchName,
      platformName,
      violationUrl,
      accountChannel,
      contentType,
      status,
      views,
      timeAdded,
      active,
      notes
    } = req.body;
    
    const violation = await Violation.findById(req.params.id);
    
    if (!violation) {
      return res.status(404).json({ error: 'Violation not found' });
    }
    
    // Update fields
    if (matchName !== undefined) violation.matchName = matchName;
    if (platformName !== undefined) violation.platformName = platformName;
    if (violationUrl !== undefined) violation.violationUrl = violationUrl;
    if (accountChannel !== undefined) violation.accountChannel = accountChannel;
    if (contentType !== undefined) violation.contentType = contentType;
    if (status !== undefined) violation.status = status;
    if (views !== undefined) violation.views = views;
    if (timeAdded !== undefined) violation.timeAdded = new Date(timeAdded);
    if (active !== undefined) violation.active = active;
    
    // Handle notes - convert to array if string
    if (notes !== undefined) {
      if (typeof notes === 'string') {
        violation.notes = notes.trim() ? [notes.trim()] : [];
      } else if (Array.isArray(notes)) {
        violation.notes = notes.filter(n => n && n.trim());
      }
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
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
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



