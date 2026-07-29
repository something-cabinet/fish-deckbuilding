extends Node2D
## Diagnostic: inspect Rust BattleScene loading and click handling.
##
## IMPORTANT: RuntimeTest's --call uses callv() which doesn't support await.
## All methods callable from CLI must be synchronous.
##
## Async setup (loading battle scene) happens in _ready(), then
## sync methods can query the initialized scene.

var battle_scene: Node = null
var battle_loaded: bool = false

func _ready() -> void:
	# Async setup: load battle scene in background
	_load_battle_async()

func _load_battle_async() -> void:
	"""Load battle scene asynchronously (runs via call_deferred from _ready)."""
	var packed = load("res://scenes/battle/battle.tscn")
	if not packed:
		print("[RT:ERR] Cannot load battle.tscn")
		return
	
	battle_scene = packed.instantiate()
	add_child(battle_scene)
	
	# Wait for Rust extension to initialize
	for i in 3:
		await get_tree().process_frame
	
	battle_loaded = true
	print("[RT:OK] BattleScene loaded, class=%s" % battle_scene.get_class())
	print("[RT:OK] on_end_turn available: %s" % battle_scene.has_method("on_end_turn"))

func check_rust_extension() -> void:
	"""Check if BattleScene class is registered in ClassDB."""
	print("[RT:PRINT] ClassDB.has_class(BattleScene): %s" % ClassDB.class_exists("BattleScene"))
	
	# Check if our battle loaded
	if battle_loaded:
		print("[RT:PRINT] BattleScene class: %s" % battle_scene.get_class())
		print("[RT:PRINT] on_end_turn: %s" % battle_scene.has_method("on_end_turn"))
		print("[RT:PRINT] on_restart: %s" % battle_scene.has_method("on_restart"))
		
		var ui = battle_scene.get_node_or_null("UI")
		if ui:
			var tl = ui.get_node_or_null("TurnLabel")
			if tl:
				print("[RT:PRINT] TurnLabel: %s" % tl.text)
			var ml = ui.get_node_or_null("ManaLabel")
			if ml:
				print("[RT:PRINT] ManaLabel: %s" % ml.text)
	else:
		print("[RT:PRINT] BattleScene not yet loaded")

func end_turn() -> void:
	"""Call on_end_turn signal on battle scene (sync, no await needed)."""
	if not battle_loaded:
		print("[RT:ERR] BattleScene not loaded yet")
		_quit(1)
		return
	
	battle_scene.call("on_end_turn")
	print("[RT:OK] on_end_turn called")

func check_turn_label() -> void:
	"""Print the turn label text."""
	if not battle_loaded:
		print("[RT:ERR] BattleScene not loaded yet")
		_quit(1)
		return
	
	var ui = battle_scene.get_node_or_null("UI")
	if not ui:
		print("[RT:ERR] UI node not found")
		_quit(1)
		return
	
	var tl = ui.get_node_or_null("TurnLabel")
	if tl:
		print("[RT:PRINT] TurnLabel.text = %s" % tl.text)
	else:
		print("[RT:ERR] TurnLabel not found")
		_quit(1)

func check_banner() -> void:
	"""Print result banner visibility."""
	if not battle_loaded:
		return
	var ui = battle_scene.get_node_or_null("UI")
	if ui:
		var rb = ui.get_node_or_null("ResultBanner")
		if rb:
			print("[RT:PRINT] ResultBanner.visible = %s" % rb.visible)

func _quit(code: int = 0) -> void:
	print("[RT:RESULTS] Diagnostic %s" % ("PASS" if code == 0 else "FAIL"))
	get_tree().quit(code)
