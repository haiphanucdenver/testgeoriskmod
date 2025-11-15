"""
Test script for Borromean Risk - Local Lore AI Agents
Run this to verify your installation and API key setup
"""

import sys
import os
from datetime import datetime
from pathlib import Path

# Make repo root importable so `import ai_agents.*` works whether running from
# ai_agents/ or repo root.
repo_root = Path(__file__).resolve().parent.parent
if str(repo_root) not in sys.path:
    sys.path.insert(0, str(repo_root))

def test_imports():
    """Test that all required modules can be imported"""
    print("1. Testing imports...")
    try:
        from ai_agents.models import LocalLoreExtraction, ResearchQuery, SourceType
        from ai_agents.extraction_agent import DocumentExtractionAgent
        from ai_agents.research_agent import DeepResearchAgent
        from ai_agents.lore_calculator import LoreScoreCalculator
        from ai_agents.file_processor import FileProcessor
        from ai_agents.config import Config
        print("   ✓ All imports successful")
        return True
    except ImportError as e:
        print(f"   ✗ Import failed: {e}")
        return False

def test_config():
    """Test configuration"""
    print("\n2. Testing configuration...")
    try:
        from ai_agents.config import Config

        api_key = os.getenv("OPENAI_API_KEY") or getattr(Config, "OPENAI_API_KEY", None)
        if not api_key:
            print("   ⚠️  Warning: OPENAI_API_KEY not set")
            print("   Please add your API key to .env file or set OPENAI_API_KEY env var")
            return False

        print(f"   ✓ API key configured (present)")
        print(f"   ✓ Extraction model: {getattr(Config, 'OPENAI_MODEL', 'unknown')}")
        print(f"   ✓ Research model: {getattr(Config, 'OPENAI_RESEARCH_MODEL', 'unknown')}")
        return True
    except Exception as e:
        print(f"   ✗ Configuration error: {e}")
        return False

def test_lore_calculator():
    """Test L-score calculator"""
    print("\n3. Testing L-score calculator...")
    try:
        from ai_agents.lore_calculator import LoreScoreCalculator
        from ai_agents.models import LocalLoreExtraction, SourceType

        calculator = LoreScoreCalculator()

        # Create test data
        test_lore = LocalLoreExtraction(
            event_narrative="Test event",
            place_name="Test location",
            years_ago=10,
            event_date_uncertainty_years=1,
            source_type=SourceType.SCIENTIFIC,
            source_author="Test Author",
            source_url="https://example.com",
            distance_to_report=5.0
        )

        # Calculate scores
        updated_lore = calculator.update_lore_with_scores(test_lore)

        print(f"   ✓ Recent score: {updated_lore.recent_score:.3f}")
        print(f"   ✓ Credibility score: {updated_lore.credibility_score:.3f}")
        print(f"   ✓ Spatial score: {updated_lore.spatial_score:.3f}")
        print(f"   ✓ Final L-score: {updated_lore.l_score:.3f}")

        # Validate scores are in range [0, 1]
        assert 0 <= updated_lore.l_score <= 1, "L-score out of range"
        assert 0 <= updated_lore.recent_score <= 1, "Recent score out of range"
        assert 0 <= updated_lore.credibility_score <= 1, "Credibility score out of range"
        assert 0 <= updated_lore.spatial_score <= 1, "Spatial score out of range"

        print("   ✓ All scores in valid range [0, 1]")
        return True

    except Exception as e:
        print(f"   ✗ Calculator test failed: {e}")
        return False

def test_file_processor():
    """Test file processor"""
    print("\n4. Testing file processor...")
    test_file = "test_file.txt"
    try:
        from ai_agents.file_processor import FileProcessor

        # Create a test file
        test_content = "Test content for file processing"
        with open(test_file, 'w') as f:
            f.write(test_content)

        # Test extraction (handle both static and instance APIs)
        extracted = None
        if hasattr(FileProcessor, "extract_text"):
            extracted = FileProcessor.extract_text(test_file)
        elif hasattr(FileProcessor, "extract_text_from_file"):
            extracted = FileProcessor.extract_text_from_file(test_file)
        else:
            # Try instance-based API
            fp = FileProcessor()
            if hasattr(fp, "extract_text"):
                extracted = fp.extract_text(test_file)
            elif hasattr(fp, "extract_text_from_file"):
                extracted = fp.extract_text_from_file(test_file)
            else:
                raise RuntimeError("FileProcessor has no known extract_text method")

        # Clean up
        os.remove(test_file)

        assert extracted == test_content, "Extracted content doesn't match"
        print(f"   ✓ File processing works correctly")
        return True

    except Exception as e:
        print(f"   ✗ File processor test failed: {e}")
        if os.path.exists(test_file):
            os.remove(test_file)
        return False

def test_extraction_agent():
    """Test extraction agent (requires API key)"""
    print("\n5. Testing extraction agent...")
    try:
        from ai_agents.extraction_agent import DocumentExtractionAgent
        from ai_agents.models import ExtractionRequest
        from ai_agents.config import Config

        api_key = os.getenv("OPENAI_API_KEY") or getattr(Config, "OPENAI_API_KEY", None)
        if not api_key:
            print("   ⚠️  Skipping (no API key)")
            return True

        agent = DocumentExtractionAgent()

        # Simple test text
        test_text = """
        In November 1985, a massive debris flow destroyed the town of Armero in Colombia.
        The event was triggered by volcanic activity from Nevado del Ruiz.
        Approximately 23,000 people died in this tragedy.
        """

        request = ExtractionRequest(
            text=test_text,
            location_context="Colombia"
        )

        print("   ⏳ Calling OpenAI API (this may take 10-20 seconds)...")
        # support both sync and async helper names if present
        if hasattr(agent, "extract_from_text_sync"):
            results = agent.extract_from_text_sync(request)
        else:
            # attempt to run coroutine via asyncio
            import asyncio
            results = asyncio.run(agent.extract_from_text(request))

        print(f"   ✓ Extracted {len(results)} event(s)")

        if results:
            lore = results[0]
            print(f"   ✓ Event: {getattr(lore, 'place_name', 'unknown')}")
            print(f"   ✓ L-score: {getattr(lore, 'l_score', 0.0):.3f}")

        return True

    except Exception as e:
        print(f"   ✗ Extraction agent test failed: {e}")
        print(f"   Error type: {type(e).__name__}")
        return False

def test_research_agent():
    """Test research agent (requires API key)"""
    print("\n6. Testing research agent...")
    try:
        from ai_agents.research_agent import DeepResearchAgent
        from ai_agents.models import ResearchQuery, HazardType
        from ai_agents.config import Config

        api_key = os.getenv("OPENAI_API_KEY") or getattr(Config, "OPENAI_API_KEY", None)
        if not api_key:
            print("   ⚠️  Skipping (no API key)")
            return True

        agent = DeepResearchAgent()

        query = ResearchQuery(
            location="Armero, Colombia",
            hazard_type=HazardType.DEBRIS_FLOW,
            time_range_years=50,
            max_sources=5
        )

        print("   ⏳ Conducting research (this may take 30-60 seconds)...")
        # support both sync and async variants
        if hasattr(agent, "conduct_research_sync"):
            result = agent.conduct_research_sync(query)
        else:
            import asyncio
            result = asyncio.run(agent.conduct_research(query))

        print(f"   ✓ Found {getattr(result, 'sources_count', 0)} event(s)")
        print(f"   ✓ Confidence: {getattr(result, 'confidence', 0.0):.2%}")

        return True

    except Exception as e:
        print(f"   ✗ Research agent test failed: {e}")
        print(f"   Error type: {type(e).__name__}")
        return False

def main():
    """Run all tests"""
    print("="*60)
    print("Borromean Risk - AI Agents Test Suite")
    print("="*60)

    tests = [
        ("Imports", test_imports),
        ("Configuration", test_config),
        ("L-score Calculator", test_lore_calculator),
        ("File Processor", test_file_processor),
    ]

    # Only run API tests if explicitly requested
    if "--full" in sys.argv:
        tests.extend([
            ("Extraction Agent", test_extraction_agent),
            ("Research Agent", test_research_agent),
        ])
        print("\nRunning FULL test suite (includes API calls)")
    else:
        print("\nRunning BASIC test suite")
        print("Use --full flag to test API agents (requires OpenAI key)")

    results = []

    for name, test_func in tests:
        try:
            passed = test_func()
            results.append((name, passed))
        except Exception as e:
            print(f"\n   ✗ Unexpected error in {name}: {e}")
            results.append((name, False))

    # Summary
    print("\n" + "="*60)
    print("Test Summary")
    print("="*60)

    passed_count = sum(1 for _, passed in results if passed)
    total_count = len(results)

    for name, passed in results:
        status = "✓ PASS" if passed else "✗ FAIL"
        print(f"{status:10} {name}")

    print("="*60)
    print(f"Results: {passed_count}/{total_count} tests passed")

    if passed_count == total_count:
        print("\n🎉 All tests passed! System is ready to use.")
        return 0
    else:
        print("\n⚠️  Some tests failed. Please check the errors above.")
        return 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)
