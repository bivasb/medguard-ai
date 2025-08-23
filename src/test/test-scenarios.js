/**
 * TEST SCENARIOS FOR MEDGUARD AI
 * 
 * This test suite validates that the primary agent correctly handles
 * various drug interaction scenarios and produces expected results.
 */

import PrimaryAgent from '../agents/primary-agent.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Test Runner for MedGuard AI Scenarios
 */
class MedGuardTestRunner {
  constructor() {
    this.primaryAgent = new PrimaryAgent({
      timeout_ms: 10000, // Longer timeout for testing
      enable_patient_context: true,
      verbose: false // Reduce noise during testing
    });
    
    this.loadScenarios();
  }

  /**
   * Load test scenarios from JSON file
   */
  loadScenarios() {
    try {
      const scenariosPath = join(__dirname, '../../data/mock-scenarios.json');
      const scenariosData = JSON.parse(readFileSync(scenariosPath, 'utf8'));
      this.scenarios = scenariosData.scenarios;
      this.testCases = scenariosData.test_cases;
      
      console.log(`📋 Loaded ${this.scenarios.length} scenarios and ${this.testCases.length} test cases`);
    } catch (error) {
      console.error('❌ Failed to load scenarios:', error);
      process.exit(1);
    }
  }

  /**
   * Run all test scenarios
   */
  async runAllTests() {
    console.log('\n🧪 Starting MedGuard AI Test Suite');
    console.log('=====================================\n');

    let passed = 0;
    let failed = 0;
    const results = [];

    // Test major scenarios
    for (const scenario of this.scenarios) {
      try {
        console.log(`🔍 Testing: ${scenario.title}`);
        const result = await this.testScenario(scenario);
        
        if (result.passed) {
          console.log(`✅ PASSED: ${scenario.scenario_id}`);
          passed++;
        } else {
          console.log(`❌ FAILED: ${scenario.scenario_id}`);
          console.log(`   Expected: ${scenario.expected_result.risk_level}`);
          console.log(`   Got: ${result.actual_risk_level}`);
          failed++;
        }
        
        results.push(result);
        console.log(''); // Empty line for readability
        
      } catch (error) {
        console.log(`💥 ERROR: ${scenario.scenario_id} - ${error.message}`);
        failed++;
        results.push({
          scenario_id: scenario.scenario_id,
          passed: false,
          error: error.message
        });
      }
    }

    // Test simple drug name variations
    console.log('🔤 Testing drug name variations...\n');
    for (const testCase of this.testCases) {
      try {
        const result = await this.testDrugNameVariation(testCase);
        
        if (result.passed) {
          console.log(`✅ PASSED: ${testCase.input} → ${testCase.expected_risk}`);
          passed++;
        } else {
          console.log(`❌ FAILED: ${testCase.input}`);
          console.log(`   Expected: ${testCase.expected_risk}`);
          console.log(`   Got: ${result.actual_risk_level}`);
          failed++;
        }
      } catch (error) {
        console.log(`💥 ERROR: ${testCase.input} - ${error.message}`);
        failed++;
      }
    }

    // Print summary
    console.log('\n📊 Test Results Summary');
    console.log('========================');
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

    if (failed > 0) {
      console.log('\n⚠️  Some tests failed. Review the results above.');
      process.exit(1);
    } else {
      console.log('\n🎉 All tests passed!');
    }

    return results;
  }

  /**
   * Test a specific scenario
   */
  async testScenario(scenario) {
    const startTime = Date.now();
    
    try {
      // Call primary agent with scenario data
      const result = await this.primaryAgent.checkInteraction(
        scenario.drugs_to_check,
        scenario.patient_id
      );

      const processingTime = Date.now() - startTime;
      
      // Validate result structure
      this.validateResultStructure(result);
      
      // Check if risk level matches expected
      const expectedRisk = scenario.expected_result.risk_level;
      const actualRisk = result.risk_level;
      const riskMatches = expectedRisk === actualRisk;
      
      // Check if processing time is acceptable (< 5 seconds)
      const timingOk = processingTime < 5000;
      
      // Validate recommendations exist for non-safe interactions
      const hasRecommendations = result.recommendations && result.recommendations.length > 0;
      const recommendationsOk = actualRisk === 'SAFE' || hasRecommendations;
      
      const passed = riskMatches && timingOk && recommendationsOk;
      
      return {
        scenario_id: scenario.scenario_id,
        passed,
        expected_risk_level: expectedRisk,
        actual_risk_level: actualRisk,
        processing_time_ms: processingTime,
        timing_ok: timingOk,
        recommendations_ok: recommendationsOk,
        details: {
          explanation: result.explanation,
          recommendations_count: result.recommendations?.length || 0,
          patient_context_used: !!result.patient_context
        }
      };
    } catch (error) {
      return {
        scenario_id: scenario.scenario_id,
        passed: false,
        error: error.message,
        processing_time_ms: Date.now() - startTime
      };
    }
  }

  /**
   * Test drug name variation handling
   */
  async testDrugNameVariation(testCase) {
    try {
      const result = await this.primaryAgent.checkInteraction(testCase.input);
      
      const expectedRisk = testCase.expected_risk;
      const actualRisk = result.risk_level;
      const passed = expectedRisk === actualRisk;
      
      return {
        input: testCase.input,
        passed,
        expected_risk_level: expectedRisk,
        actual_risk_level: actualRisk
      };
    } catch (error) {
      return {
        input: testCase.input,
        passed: false,
        error: error.message
      };
    }
  }

  /**
   * Validate that result has proper structure
   */
  validateResultStructure(result) {
    const requiredFields = [
      'risk_level',
      'explanation',
      'recommendations',
      'processing_time_ms'
    ];

    for (const field of requiredFields) {
      if (!(field in result)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Validate risk level is one of expected values
    if (!['SAFE', 'WARNING', 'DANGER', 'ERROR'].includes(result.risk_level)) {
      throw new Error(`Invalid risk level: ${result.risk_level}`);
    }

    // Validate explanation is a non-empty string
    if (typeof result.explanation !== 'string' || result.explanation.length === 0) {
      throw new Error('Explanation must be a non-empty string');
    }

    // Validate recommendations is an array
    if (!Array.isArray(result.recommendations)) {
      throw new Error('Recommendations must be an array');
    }

    // Validate processing time is a number
    if (typeof result.processing_time_ms !== 'number' || result.processing_time_ms < 0) {
      throw new Error('Processing time must be a positive number');
    }
  }

  /**
   * Run performance benchmark
   */
  async runPerformanceBenchmark() {
    console.log('\n⚡ Running Performance Benchmark');
    console.log('==================================\n');

    const testDrugs = [
      ['warfarin', 'aspirin'],
      ['methotrexate', 'trimethoprim'],
      ['sertraline', 'tramadol'],
      ['atorvastatin', 'clarithromycin'],
      ['lisinopril', 'potassium']
    ];

    const times = [];
    
    for (let i = 0; i < testDrugs.length; i++) {
      const drugs = testDrugs[i];
      const startTime = Date.now();
      
      try {
        await this.primaryAgent.checkInteraction(drugs);
        const duration = Date.now() - startTime;
        times.push(duration);
        
        console.log(`Test ${i + 1}: ${drugs.join(' + ')} → ${duration}ms`);
      } catch (error) {
        console.log(`Test ${i + 1}: ${drugs.join(' + ')} → ERROR: ${error.message}`);
      }
    }

    if (times.length > 0) {
      const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      const maxTime = Math.max(...times);
      const minTime = Math.min(...times);
      
      console.log(`\n📊 Performance Results:`);
      console.log(`   Average: ${avgTime.toFixed(0)}ms`);
      console.log(`   Min: ${minTime}ms`);
      console.log(`   Max: ${maxTime}ms`);
      console.log(`   Target: <3000ms`);
      
      if (avgTime < 3000) {
        console.log(`   ✅ Performance target met!`);
      } else {
        console.log(`   ⚠️  Performance target not met`);
      }
    }
  }

  /**
   * Run integration test with external APIs
   */
  async runIntegrationTest() {
    console.log('\n🌐 Running Integration Tests');
    console.log('=============================\n');

    // Test RxNorm API connectivity
    console.log('🔍 Testing RxNorm API...');
    try {
      const result = await this.primaryAgent.checkInteraction(['warfarin']);
      console.log('✅ RxNorm API accessible');
    } catch (error) {
      console.log('❌ RxNorm API error:', error.message);
    }

    // Test FDA API connectivity  
    console.log('🔍 Testing FDA OpenFDA API...');
    try {
      const result = await this.primaryAgent.checkInteraction(['warfarin', 'aspirin']);
      console.log('✅ FDA OpenFDA API accessible');
    } catch (error) {
      console.log('❌ FDA API error:', error.message);
    }

    // Test patient database
    console.log('🔍 Testing patient database...');
    try {
      const result = await this.primaryAgent.checkInteraction(['warfarin', 'aspirin'], 'P001');
      if (result.patient_context) {
        console.log('✅ Patient database accessible');
      } else {
        console.log('⚠️  Patient database returned no context');
      }
    } catch (error) {
      console.log('❌ Patient database error:', error.message);
    }
  }
}

/**
 * Main test execution
 */
async function main() {
  const runner = new MedGuardTestRunner();
  
  try {
    // Run main test suite
    await runner.runAllTests();
    
    // Run performance benchmark
    await runner.runPerformanceBenchmark();
    
    // Run integration tests
    await runner.runIntegrationTest();
    
    console.log('\n🎯 All tests completed successfully!');
    
  } catch (error) {
    console.error('\n💥 Test runner failed:', error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default MedGuardTestRunner;