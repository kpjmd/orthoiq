# PROMIS Questionnaires for OrthoIQ

## PROMIS Physical Function Short Form 10a

**Administration**: All users at baseline and 2/4/8 week follow-ups
**Scoring**: Raw score → T-score lookup table
**Time**: ~90 seconds

### Questions

**Stem**: "Are you able to..."

| # | Question | Response Options (1-5) |
|---|----------|----------------------|
| PFA11 | ...do chores such as vacuuming or yard work? | Without difficulty (5) / With little difficulty (4) / With some difficulty (3) / With much difficulty (2) / Unable to do (1) |
| PFA21 | ...go up and down stairs at a normal pace? | 5/4/3/2/1 |
| PFA23 | ...go for a walk of at least 15 minutes? | 5/4/3/2/1 |
| PFA53 | ...run errands and shop? | 5/4/3/2/1 |
| PFB1 | ...exercise for an hour? | 5/4/3/2/1 |
| PFC12 | ...walk for more than an hour? | 5/4/3/2/1 |
| PFC13 | ...run or jog for two miles? | 5/4/3/2/1 |
| PFC36 | ...do two hours of physical labor? | 5/4/3/2/1 |
| PFC37 | ...exercise hard for half an hour? | 5/4/3/2/1 |
| PFC56 | ...stand without support for 30 minutes? | 5/4/3/2/1 |

### Scoring (T-Score Conversion)

**Raw Score = Sum of all responses (range: 10-50)**

| Raw Score | T-Score |
|-----------|---------|
| 10 | 21.2 |
| 15 | 28.5 |
| 20 | 32.8 |
| 25 | 36.2 |
| 30 | 39.4 |
| 35 | 42.9 |
| 40 | 47.3 |
| 45 | 53.5 |
| 50 | 61.5 |

**Interpretation**:
- T-Score mean: 50 (general population)
- T-Score SD: 10
- Higher score = better physical function
- Clinically meaningful change: ≥ 5 T-score points

---

## PROMIS Pain Interference Short Form 6a

**Administration**: Users with pain-related queries (pain mentioned in symptoms or painLevel > 0)
**Scoring**: Raw score → T-score lookup table
**Time**: ~60 seconds

### Questions

**Stem**: "In the past 7 days..."
**Scale**: 1 (Not at all) to 5 (Very much)

| # | Question |
|---|----------|
| PAININ9 | How much did pain interfere with your day to day activities? |
| PAININ22 | How much did pain interfere with work around the home? |
| PAININ31 | How much did pain interfere with your ability to participate in social activities? |
| PAININ34 | How much did pain interfere with your household chores? |
| PAININ36 | How much did pain interfere with your enjoyment of recreational activities? |
| PAININ37 | How much did pain interfere with your family life? |

### Scoring (T-Score Conversion)

**Raw Score = Sum of all responses (range: 6-30)**

| Raw Score | T-Score |
|-----------|---------|
| 6 | 38.6 |
| 10 | 47.8 |
| 14 | 54.4 |
| 18 | 59.9 |
| 22 | 65.3 |
| 26 | 71.1 |
| 30 | 77.8 |

**Interpretation**:
- T-Score mean: 50 (general population)
- T-Score SD: 10
- Higher score = worse pain interference (opposite of Physical Function!)
- Clinically meaningful change: ≥ 5 T-score points **reduction**

---

## Implementation Notes

### Database Schema
```javascript
{
  consultationId: "consultation_xyz",
  userId: "user_abc",
  timepoint: "baseline" | "2week" | "4week" | "8week",
  timestamp: "2025-02-20T...",
  
  physicalFunction: {
    rawScore: 35,
    tScore: 42.9,
    responses: {
      PFA11: 4,
      PFA21: 3,
      // ... all 10 responses
    }
  },
  
  painInterference: {
    rawScore: 18,
    tScore: 59.9,
    responses: {
      PAININ9: 3,
      // ... all 6 responses
    }
  }
}
```

### Delta Calculation
```javascript
function calculateDelta(baseline, followup) {
  return {
    physicalFunction: followup.physicalFunction.tScore - baseline.physicalFunction.tScore,
    painInterference: baseline.painInterference.tScore - followup.painInterference.tScore,
    // Note: Pain Interference delta is reversed (reduction is positive)
  };
}

// Settlement criteria example
const improvement = delta.physicalFunction >= 5 && delta.painInterference >= 5;
```

### UI Display

**Baseline prompt (during processing wait):**
```
Help us track your progress

Complete this quick 2-minute questionnaire to:
✓ Track your recovery over time
✓ Validate AI agent predictions
✓ Contribute to research-grade outcomes data

Your 4-week and 8-week follow-ups will settle the prediction market.

[Start Questionnaire] [Skip for now]
```

**Follow-up reminder (2/4/8 weeks):**
```
Your 4-week progress check is ready

Complete your follow-up to:
✓ See your improvement score
✓ Settle your prediction market stake (50 $ORTHO)
✓ Unlock updated Intelligence Card

[Complete Now] [Remind me tomorrow]
```

### Progressive Display

**For pain-related queries:**
1. Show Physical Function 10a first (always)
2. After completion, ask: "This consultation mentioned pain. Would you like to track pain interference as well? (6 additional questions, 1 minute)"
3. If yes → Pain Interference 6a
4. If no → Complete with Physical Function only

This prevents overwhelming users while capturing maximum data for pain cases.