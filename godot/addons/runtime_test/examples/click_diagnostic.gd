extends Node
## Click Diagnostic - injects mouse events and reports what happens
##
## Usage:
##   godot --path godot --headless scenes/battle/battle.tscn -- \
##     --call:.:run_diagnostic
##
## This script is autoloaded as RuntimeTest and can call methods on
## battle.tscn's root node (BattleScene Rust extension).

var battle: Node = null
var hero_click_pos: Vector2 = Vector2(440, 380)   # grid (0,2)
var move_click_pos: Vector2 = Vector2(520, 380)   # grid (1,2)

func run_diagnostic() -> void:
	await get_tree().process_frame
	battle = get_tree().current_scene

	print("=== CLICK DIAGNOSTIC ===")

	# 1. Check if Rust extension loaded BattleScene class
	print("1. Root type: ", battle.get_class())
	print("   Has 'on_end_turn' method: ", battle.has_method("on_end_turn"))
	print("   Has 'handle_click' method: ", battle.has_method("handle_click"))
	print("   Script: ", battle.get_script())

	# 2. List available methods
	var methods = battle.get_method_list()
	var method_names = methods.map(func(m): return m.name)
	print("2. Available methods: ", method_names)

	# 3. List properties
	var props = battle.get_property_list()
	var prop_names = props.map(func(p): return p.name)
	print("3. Available properties: ", prop_names)

	# 4. Inject click at hero position (grid 0,2)
	print("4. Injecting click at ", hero_click_pos, " (grid 0,2)")
	var mouse_down = InputEventMouseButton.new()
	mouse_down.button_index = MOUSE_BUTTON_LEFT
	mouse_down.pressed = true
	mouse_down.position = hero_click_pos
	Input.parse_input_event(mouse_down)

	await get_tree().process_frame
	await get_tree().process_frame

	# 5. Check state after click
	print("5. After click, phase should still be PlayerTurn")
	if battle.has_signal("state_changed"):
		print("   Scene has state_changed signal")
	else:
		print("   Scene does NOT have state_changed signal")

	# 6. Now try to end turn (this IS a #[func] method)
	print("6. Calling on_end_turn...")
	if battle.has_method("on_end_turn"):
		battle.call("on_end_turn")
		await get_tree().process_frame
		await get_tree().process_frame
		print("   on_end_turn called successfully")
	else:
		print("   on_end_turn NOT available")

	# 7. Check if battle ended
	print("7. Checking result banner visibility...")
	var result_banner = battle.get_node_or_null("UI/ResultBanner")
	if result_banner:
		print("   ResultBanner visible: ", result_banner.visible)
	else:
		print("   ResultBanner not found")

	print("=== DIAGNOSTIC COMPLETE ===")

func try_end_turn() -> void:
	"""Callable from RuntimeTest --call:.:try_end_turn"""
	if battle and battle.has_method("on_end_turn"):
		battle.call("on_end_turn")
		print("[RT:OK] called on_end_turn")
	else:
		print("[RT:ERR] on_end_turn not available")

func check_root() -> void:
	"""Prints root scene info"""
	var root = get_tree().current_scene
	print("[RT:PRINT] root.class = %s" % root.get_class())
	print("[RT:PRINT] root.has_method('on_end_turn') = %s" % root.has_method("on_end_turn"))

func inject_click(gx: int, gy: int) -> void:
	"""Inject mouse click at grid position"""
	var px = 400 + gx * 80 + 40
	var py = 180 + gy * 80 + 40
	var event = InputEventMouseButton.new()
	event.button_index = MOUSE_BUTTON_LEFT
	event.pressed = true
	event.position = Vector2(px, py)
	Input.parse_input_event(event)
	print("[RT:OK] injected click at grid (%d,%d) → screen (%d,%d)" % [gx, gy, px, py])
