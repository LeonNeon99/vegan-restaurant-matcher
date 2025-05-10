def render_matching_screen(player_label, player_name, likes_key, index_key):
    st.header(f"{player_name}\n's Turn ({player_label})")
    if not st.session_state.restaurants_data: st.warning("No restaurants."); return    current_index = st.session_state[index_key]
    if current_index >= len(st.session_state.restaurants_data):
        st.info("All restaurants seen!")
        if st.button("Finished - Proceed"):
            if player_label == "Player 1": st.session_state.app_stage = "player2_matching"
            else: st.session_state.app_stage = "results"
            st.rerun()
        return