# OrthoIQ Web Interface - Agents Integration Test Guide

## ✅ **INTEGRATION COMPLETE** - Ready for Testing

The web interface has been successfully updated to support the OrthoIQ-Agents system. Here's how to verify it's working:

---

## 🔧 **Changes Made**

### 1. **User Tier Assignment Fixed**
- **Email users** now get `tier: 'medical'` (triggers agent system)
- **Guest users** now get `tier: 'authenticated'` (triggers agent system)  
- Previous `tier: 'basic'` only got 1 question/day and NO agents

### 2. **Enhanced ResponseCard Display**
- **Specialist consultation badges** when agents are used
- **Agent coordination indicators** show network status
- **Enhanced enrichment display** differentiates consultation vs research
- **Performance metrics** visible for agent execution

### 3. **Complete Data Flow**
- All agent response data now captured and displayed
- Specialist consultation, agent badges, routing info all passed through

---

## 🧪 **How to Test**

### **Step 1: Clear Browser Data** (IMPORTANT!)
```bash
# Clear localStorage to reset any cached user data
# In browser console:
localStorage.clear()
# Then refresh the page
```

### **Step 2: Sign in as Email User**
1. Go to `http://localhost:3001`
2. Click "Sign In with Email" 
3. Enter any email (e.g., `test@example.com`)
4. **Check browser console** - you should see:
   ```
   [WebOrthoInterface] Sending request with tier: medical, user: {...}
   ```

### **Step 3: Ask a Medical Question**
Try these test questions:
- *"What causes shoulder impingement and how do I treat it?"*
- *"I have knee pain when running, what could be wrong?"*  
- *"How do I recover from an ankle sprain effectively?"*

### **Step 4: Look for Agent Indicators**

#### **🎯 What You Should See:**

**Agent Coordination Badges** (in header):
- 🤖 "1 agent coordinated" 
- 🌐 "Network Active" or "Network Degraded"
- ⚡ "80% success rate" 
- 📊 "Load: 0/5"

**Enhanced Enrichment Section:**
- **👥 "Specialist Consultation"** (if agents respond quickly)
- **📚 "Research Insights"** (if agents timeout - fallback mode)
- **Purple badge:** "medical user • Multi-specialist" 
- **Enhancement text:** "Enhanced with OrthoIQ-Agents consultation network"

**Specialist Badges** (when consultation succeeds):
```
👥 Consulting Specialists:
🧠 OrthoTriage Master • Triage and Case Coordination
🧠 Pain Whisperer • Pain Management and Assessment  
🧠 Movement Detective • Biomechanics and Movement Analysis
🧠 Strength Sage • Functional Restoration and Rehabilitation
```

---

## 🔍 **Expected Behavior**

### **Scenario A: Agents Respond Quickly (< 25 seconds)**
- You'll see **Specialist Consultation** interface
- Multiple specialist badges displayed
- Consultation-style enrichments with specialist assessments
- Network status shows "Active"

### **Scenario B: Agents Timeout (> 25 seconds)** 
- You'll see **Research Insights** interface (fallback)
- Research synthesis enrichments
- Network status shows "Degraded"
- **This is normal and expected behavior!**

### **Scenario C: Guest User**
- Same behavior as email user
- Gets `tier: 'authenticated'` (triggers agents)
- May see slightly different badge styling

---

## 🐛 **Troubleshooting**

### **Not Seeing Agent Features?**
1. **Clear localStorage:** `localStorage.clear()` in browser console
2. **Check tier assignment:** Look for console log showing tier
3. **Verify authentication:** Make sure you're signed in (email or guest)
4. **Check agent system:** Ensure `localhost:3000` is running

### **Only Seeing Basic Research?**
- This indicates user tier is still `'basic'` 
- Clear browser data and sign in again
- Check console logs for tier assignment

### **No Agent Coordination Badges?**
- Agent system may be offline on `localhost:3000`
- Check that OrthoIQ-Agents is running and healthy
- Network status will show as "Degraded" in this case

---

## 📊 **API Response Verification**

You can also test the API directly:

```bash
# Test medical tier user (should trigger agents)
curl -X POST http://localhost:3001/api/claude \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What causes shoulder pain?",
    "fid": "email_test_123",
    "tier": "medical"
  }' | jq .

# Look for these fields in response:
# - "userTier": "medical"
# - "agentRouting": {...}  
# - "agentNetwork": {...}
# - "hasSpecialistConsultation": boolean
```

---

## ✅ **Success Indicators**

### **✓ Integration Working If You See:**
1. **Console log:** `[WebOrthoInterface] Sending request with tier: medical`
2. **Agent badges:** 🤖 coordination indicators in response header
3. **Enhanced enrichments:** Either specialist consultation OR research insights
4. **Performance metrics:** Response times and success rates displayed
5. **Purple badges:** Different styling for agent-enhanced responses

### **✓ Fallback Working If You See:**
- Research insights instead of specialist consultation
- "Network Degraded" status
- Still shows agent coordination metrics
- **This means the system is working correctly!**

---

## 🎯 **Bottom Line**

**The web interface now fully supports the OrthoIQ-Agents system:**

- ✅ **Email users** → `medical` tier → Agents triggered  
- ✅ **Guest users** → `authenticated` tier → Agents triggered
- ✅ **Specialist consultation UI** → When agents respond quickly
- ✅ **Research fallback UI** → When agents timeout (expected)
- ✅ **Agent coordination display** → Shows network status and performance
- ✅ **Complete tokenomics data** → All metrics tracked and displayable

**Your web users will now get the enhanced OrthoIQ-Agents experience!** 🚀

The system gracefully handles both successful specialist consultations and fallback scenarios, ensuring users always get value while testing the tokenomics integration.

---

*Last updated: September 24, 2025*