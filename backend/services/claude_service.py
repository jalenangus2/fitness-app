"""Claude AI service for generating workout and meal plans."""
import json
import re
from anthropic import Anthropic
from ..config import get_settings


def get_client() -> Anthropic:
    return Anthropic(api_key=get_settings().ANTHROPIC_API_KEY)


def _extract_json(text: str) -> dict:
    """Extract JSON from Claude response, handling markdown code blocks."""
    text = re.sub(r'```(?:json)?\n?', '', text).strip()
    return json.loads(text)


def generate_workout_plan(muscle_groups: list[str], difficulty: str, duration_mins: int, notes: str = "") -> dict:
    """Generate a workout plan using Claude AI.

    Returns dict with:
    - name: str (descriptive plan name)
    - exercises: list of {name, sets, reps, rest_seconds, notes, order_index}
    """
    if not get_settings().ANTHROPIC_API_KEY:
        return {
            "name": f"{difficulty.title()} {', '.join(muscle_groups).title()} Workout",
            "exercises": [
                {"name": "Push-ups", "sets": 3, "reps": "10-15", "rest_seconds": 60, "notes": "Keep core tight", "order_index": 0},
                {"name": "Dumbbell Rows", "sets": 3, "reps": "10-12", "rest_seconds": 90, "notes": "Full range of motion", "order_index": 1},
            ]
        }

    groups_str = ", ".join(muscle_groups)
    additional = f"\nAdditional notes: {notes}" if notes else ""

    system_prompt = """You are an expert personal trainer. Generate a workout plan as a JSON object.
Return ONLY valid JSON with no markdown, no code blocks, no explanation text.
The JSON must have exactly this structure:
{
  "name": "descriptive workout name",
  "exercises": [
    {
      "name": "exercise name",
      "sets": 3,
      "reps": "8-12",
      "rest_seconds": 90,
      "notes": "form tips or notes",
      "order_index": 0
    }
  ]
}"""

    user_prompt = f"""Create a {difficulty} workout targeting: {groups_str}
Duration: approximately {duration_mins} minutes{additional}

Include 6-10 exercises appropriate for the target muscles and difficulty level.
For {difficulty} level, use appropriate exercise complexity and rep ranges.
Make exercise notes specific and helpful for proper form."""

    client = get_client()
    message = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=2048,
        system=system_prompt,
        messages=[{"role": "user", "content": user_prompt}]
    )

    return _extract_json(message.content[0].text)


def generate_meal_plan(
    goal: str,
    target_calories: int,
    target_protein_g: int,
    target_carbs_g: int,
    target_fat_g: int,
    duration_days: int,
    dietary_restrictions: list[str] = [],
) -> dict:
    """Generate a meal plan using Claude AI.

    Returns dict with:
    - name: str
    - meals: list of {day_number, meal_type, name, calories, protein_g, carbs_g, fat_g, recipe_notes, ingredients: [{ingredient_name, quantity, category}]}
    """
    if not get_settings().ANTHROPIC_API_KEY:
        return {
            "name": f"{goal.replace('_', ' ').title()} Meal Plan",
            "meals": [
                {
                    "day_number": 1,
                    "meal_type": "breakfast",
                    "name": "Oatmeal with Berries",
                    "calories": 350,
                    "protein_g": 12.0,
                    "carbs_g": 58.0,
                    "fat_g": 7.0,
                    "recipe_notes": "Cook oats, top with fresh berries and a drizzle of honey",
                    "ingredients": [
                        {"ingredient_name": "Rolled oats", "quantity": "1 cup", "category": "pantry"},
                        {"ingredient_name": "Mixed berries", "quantity": "1/2 cup", "category": "produce"},
                    ]
                }
            ]
        }

    restrictions_str = f"\nDietary restrictions: {', '.join(dietary_restrictions)}" if dietary_restrictions else ""
    goal_descriptions = {
        "weight_loss": "caloric deficit for weight loss, high protein to preserve muscle, moderate carbs",
        "muscle_gain": "caloric surplus for muscle building, very high protein, adequate carbs for energy",
        "maintenance": "balanced macros for weight maintenance and overall health",
        "keto": "ketogenic diet with very low carbs (<50g/day), high fat, moderate protein",
        "vegan": "plant-based diet with complete protein sources, iron-rich foods, B12 consideration",
    }
    goal_desc = goal_descriptions.get(goal, goal)

    system_prompt = """You are a registered dietitian and meal planning expert. Generate a detailed meal plan as a JSON object.
Return ONLY valid JSON with no markdown, no code blocks, no explanation text.
The JSON must have exactly this structure:
{
  "name": "descriptive meal plan name",
  "meals": [
    {
      "day_number": 1,
      "meal_type": "breakfast",
      "name": "meal name",
      "calories": 400,
      "protein_g": 25.0,
      "carbs_g": 45.0,
      "fat_g": 12.0,
      "recipe_notes": "brief preparation instructions",
      "ingredients": [
        {
          "ingredient_name": "ingredient name",
          "quantity": "amount and unit",
          "category": "produce|dairy|protein|pantry|other"
        }
      ]
    }
  ]
}"""

    user_prompt = f"""Create a {duration_days}-day meal plan for: {goal_desc}
Daily targets: {target_calories} calories, {target_protein_g}g protein, {target_carbs_g}g carbs, {target_fat_g}g fat
Include breakfast, lunch, dinner, and 1 snack per day ({duration_days * 4} total meals){restrictions_str}

Requirements:
- Hit macro targets within 10% each day
- Use realistic, accessible ingredients
- Vary meals across days (don't repeat the same meal)
- Include specific quantities for all ingredients
- Recipe notes should be clear 1-2 sentence cooking instructions"""

    client = get_client()
    message = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=8192,
        system=system_prompt,
        messages=[{"role": "user", "content": user_prompt}]
    )

    return _extract_json(message.content[0].text)
