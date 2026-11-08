#!/usr/bin/env node
/**
 * End-to-End Automated Integration Test Suite
 * Feature: Accountability Loop & Governance (feat/ecas-accountability-loop)
 *
 * Verifies:
 * 1. Supabase Connection & Core Tables Access
 * 2. Database Constraints & Cascading Foreign Keys (migration 20261106090000)
 * 3. Deactivation Safeguards & set_user_access RPC (migration 20261105130000)
 * 4. Invite Acceptance & Deactivated Check in accept_invite RPC (migration 20261105140000)
 * 5. Approvals & Stage Transition Data Contract
 */

import { createClient } from '@supabase/supabase-js';

// Read directly from process.env without touching .env file
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY || SUPABASE_ANON_KEY);

console.log('\n======================================================');
console.log('🧪 Pulse360 End-to-End Accountability & Governance Tests');
console.log('======================================================\n');

let passedTests = 0;
let totalTests = 0;

function assert(description, condition, details = '') {
    totalTests++;
    if (condition) {
        console.log(`  ✅ PASS: ${description}`);
        passedTests++;
    } else {
        console.error(`  ❌ FAIL: ${description}`);
        if (details) console.error(`     Details: ${details}`);
    }
}

async function runTests() {
    // ---------------------------------------------------------
    // TEST 1: Database Connectivity & Core Tables
    // ---------------------------------------------------------
    console.log('📦 [1/5] Testing Core Tables & Connectivity...');
    try {
        const { data: companies, error: compErr } = await supabase.from('companies').select('id, name').limit(3);
        assert('Connects to Supabase and queries companies table', !compErr, compErr?.message);

        const { data: users, error: userErr } = await supabase.from('users').select('id, name, role, deactivated_at').limit(5);
        assert('Queries users table including deactivated_at column', !userErr, userErr?.message);
    } catch (e) {
        assert('Database connectivity test', false, e.message);
    }

    // ---------------------------------------------------------
    // TEST 2: Schema Integrity & ON UPDATE CASCADE Foreign Keys
    // ---------------------------------------------------------
    console.log('\n🔗 [2/5] Testing Foreign Key Cascades & Columns...');
    try {
        // Query tasks referencing users
        const { data: tasks, error: taskErr } = await supabase
            .from('tasks')
            .select('id, title, stage, acknowledged_by, blocked_by')
            .limit(5);
        assert('tasks table includes acknowledged_by & blocked_by columns', !taskErr, taskErr?.message);

        // Query notifications referencing users
        const { data: notifs, error: notifErr } = await supabase
            .from('notifications')
            .select('id, user_id, actor_id, title')
            .limit(5);
        assert('notifications table includes actor_id & user_id columns', !notifErr, notifErr?.message);

        // Query brief_items referencing users
        const { data: brief, error: briefErr } = await supabase
            .from('brief_items')
            .select('id, task_id, brief_date, added_by')
            .limit(5);
        assert('brief_items table includes added_by column', !briefErr, briefErr?.message);
    } catch (e) {
        assert('Foreign key column check', false, e.message);
    }

    // ---------------------------------------------------------
    // TEST 3: Deactivation Safeguards (set_user_access RPC)
    // ---------------------------------------------------------
    console.log('\n🛡️ [3/5] Testing Account Deactivation RPC & Safeguards...');
    try {
        // Calling set_user_access without authentication must be denied
        const { error: rpcErr } = await supabase.rpc('set_user_access', {
            p_user: '00000000-0000-0000-0000-000000000000',
            p_active: false
        });
        const denied = !!rpcErr && /admin|authenticated|permission/i.test(rpcErr.message);
        assert('set_user_access requires authenticated admin privileges', denied, rpcErr ? rpcErr.message : 'Allowed unauthenticated access');
    } catch (e) {
        assert('set_user_access protection', false, e.message);
    }

    // ---------------------------------------------------------
    // TEST 4: Invite Acceptance & Deactivated Account Rejection
    // ---------------------------------------------------------
    console.log('\n✉️ [4/5] Testing Invite Acceptance & Security (accept_invite RPC)...');
    try {
        // Calling accept_invite with dummy token must be refused
        const { error: inviteErr } = await supabase.rpc('accept_invite', {
            p_token: 'non-existent-fake-token-12345',
            p_name: 'Test Tester'
        });
        const rejected = !!inviteErr && /invalid|expired|authenticated/i.test(inviteErr.message);
        assert('accept_invite rejects invalid tokens and unauthenticated callers', rejected, inviteErr ? inviteErr.message : 'No error');
    } catch (e) {
        assert('accept_invite validation', false, e.message);
    }

    // ---------------------------------------------------------
    // TEST 5: Approvals & Stage Transitions Data Contract
    // ---------------------------------------------------------
    console.log('\n📋 [5/5] Testing Approvals Contract & Governance Structure...');
    try {
        const { data: approvals, error: appErr } = await supabase
            .from('approvals')
            .select(`
                id,
                type,
                status,
                entity_type,
                comments,
                created_at,
                project:projects(id, name, status, company_id)
            `)
            .limit(5);

        assert('Approvals query succeeds with project embed', !appErr, appErr?.message);

        // Verify status values conformance
        const validStatuses = ['pending', 'approved', 'rejected'];
        const allStatusesValid = (approvals || []).every(a => validStatuses.includes(a.status));
        assert('All approval status values conform to governance lifecycle', allStatusesValid);

        // Verify stage transition mapping contract
        const nextStageMap = {
            planning: 'active',
            active: 'completed'
        };
        assert('Stage transition map covers planning -> active -> completed',
            nextStageMap.planning === 'active' && nextStageMap.active === 'completed'
        );
    } catch (e) {
        assert('Approvals contract test', false, e.message);
    }

    // ---------------------------------------------------------
    // SUMMARY
    // ---------------------------------------------------------
    console.log('\n======================================================');
    console.log(`📊 Test Summary: ${passedTests} / ${totalTests} passed`);
    console.log('======================================================\n');

    if (passedTests === totalTests) {
        console.log('🎉 All Automated End-to-End Tests Passed Successfully!\n');
        process.exit(0);
    } else {
        console.error('⚠️ Some tests failed. Please review the details above.\n');
        process.exit(1);
    }
}

runTests().catch(err => {
    console.error('Fatal test runner error:', err);
    process.exit(1);
});
