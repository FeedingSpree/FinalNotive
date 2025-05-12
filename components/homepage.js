import React, { useState, useEffect } from 'react';
import {
  View, Text, Image, TouchableOpacity, StyleSheet, Modal, TextInput, ScrollView, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Calendar } from 'react-native-calendars';
import { supabase } from '../utils/supabase';

export default function Homepage({ route, navigation }) {
  const { profilePic: routeProfilePic } = route.params || {};

  const [calendarVisible, setCalendarVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [note, setNote] = useState('');
  const [noteTitle, setNoteTitle] = useState('');
  const [notePriority, setNotePriority] = useState(1);
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState('username');
  const [dateNotes, setDateNotes] = useState([]);
  const [markedDates, setMarkedDates] = useState({});
  const [loading, setLoading] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [profilePic, setProfilePic] = useState(routeProfilePic || null);

  // Check authentication and get user data
  useEffect(() => {
    checkUser();
  }, []);

  // Update profile picture when route params change
  useEffect(() => {
    if (routeProfilePic) {
      setProfilePic(routeProfilePic);
    }
  }, [routeProfilePic]);

  // Load saved notes when user is available
  useEffect(() => {
    if (user) {
      loadUserNotes();
    }
  }, [user]);

  // Load notes for selected date
  useEffect(() => {
    if (selectedDate && user) {
      loadDateNotes(selectedDate);
    }
  }, [selectedDate, user]);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        // Get username from profiles table
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          setUsername(profile.username || 'username');
        }
      } else {
        // If no user is logged in, redirect to login
        navigation.navigate('Login');
      }
    } catch (error) {
      console.error('Error checking user:', error);
    }
  };

  const loadUserNotes = async () => {
    try {
      const { data, error } = await supabase
        .from('calendar_notes')
        .select('date')
        .eq('user_id', user.id);

      if (error) throw error;

      // Convert the data into marked dates
      const markedDatesMap = {};
      const uniqueDates = [...new Set(data.map(item => item.date))];
      
      uniqueDates.forEach(date => {
        markedDatesMap[date] = { 
          marked: true, 
          dotColor: '#A259FF',
          selectedColor: '#A259FF'
        };
      });

      setMarkedDates(markedDatesMap);
    } catch (error) {
      console.error('Error loading notes:', error);
    }
  };

  const loadDateNotes = async (date) => {
    try {
      const { data, error } = await supabase
        .from('calendar_notes')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', date)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDateNotes(data);
    } catch (error) {
      console.error('Error loading date notes:', error);
    }
  };

  const handleDayPress = (day) => {
    setSelectedDate(day.dateString);
    // Reset form
    setNoteTitle('');
    setNote('');
    setEditingNote(null);
  };

  const saveNote = async () => {
    if (!selectedDate || !user || !note.trim()) {
      Alert.alert('Error', 'Please enter a note');
      return;
    }

    setLoading(true);
    try {
      if (editingNote) {
        // Update existing note
        const { error } = await supabase
          .from('calendar_notes')
          .update({ 
            title: noteTitle.trim(),
            note: note.trim(),
            priority: notePriority,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingNote.id);

        if (error) throw error;
      } else {
        // Insert new note with default status as 'todo'
        const { error } = await supabase
          .from('calendar_notes')
          .insert([{
            user_id: user.id,
            date: selectedDate,
            title: noteTitle.trim(),
            note: note.trim(),
            priority: notePriority,
            status: 'todo', // Set default status
            created_at: new Date().toISOString()
          }]);

        if (error) throw error;
      }

      // Reload notes for this date
      await loadDateNotes(selectedDate);
      
      // Update marked dates
      setMarkedDates(prev => ({
        ...prev,
        [selectedDate]: { 
          marked: true, 
          dotColor: '#A259FF',
          selectedColor: '#A259FF'
        }
      }));

      Alert.alert('Success', 'Todo saved successfully!');
      
      // Reset form
      setNoteTitle('');
      setNote('');
      setNotePriority(1);
      setEditingNote(null);
    } catch (error) {
      console.error('Error saving note:', error);
      Alert.alert('Error', 'Failed to save todo. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const editNote = (noteItem) => {
    setEditingNote(noteItem);
    setNoteTitle(noteItem.title || '');
    setNote(noteItem.note || '');
  };

  const deleteNote = async (noteId) => {
    Alert.alert(
      'Delete Note',
      'Are you sure you want to delete this note?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('calendar_notes')
                .delete()
                .eq('id', noteId);

              if (error) throw error;

              // Reload notes
              await loadDateNotes(selectedDate);
              
              // Check if there are any notes left for this date
              const { data: remainingNotes } = await supabase
                .from('calendar_notes')
                .select('id')
                .eq('user_id', user.id)
                .eq('date', selectedDate);
              
              // Update marked dates
              if (!remainingNotes || remainingNotes.length === 0) {
                setMarkedDates(prev => {
                  const newMarked = { ...prev };
                  delete newMarked[selectedDate];
                  return newMarked;
                });
              }

              Alert.alert('Success', 'Note deleted successfully!');
            } catch (error) {
              console.error('Error deleting note:', error);
              Alert.alert('Error', 'Failed to delete note.');
            }
          }
        }
      ]
    );
  };

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigation.navigate('Login');
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.profileSection}>
          <Image
            source={profilePic ? { uri: profilePic } : require('../assets/default.jpg')}
            style={styles.avatar}
          />
          <Text style={styles.username}>{username}</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Account', { profilePic })}>
          <Ionicons name="settings-outline" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Calendar Card */}
      <View style={styles.calendarCard}>
        <Ionicons name="calendar" size={40} color="#fff" style={styles.calendarIcon} />
        <View style={styles.calendarText}>
          <Text style={styles.calendarTitle}>Calendar</Text>
          <Text style={styles.calendarSub}>Add tasks and manage your plans.</Text>
        </View>
        <TouchableOpacity style={styles.editButton} onPress={() => setCalendarVisible(true)}>
          <Text style={styles.editText}>EDIT</Text>
          <Ionicons name="pencil" size={16} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Modal */}
      <Modal visible={calendarVisible} animationType="slide">
        <ScrollView contentContainerStyle={styles.modalContainer}>
          <Text style={styles.modalTitle}>Select a Date</Text>
          <Calendar
            onDayPress={handleDayPress}
            markedDates={{
              ...markedDates,
              ...(selectedDate ? { 
                [selectedDate]: { 
                  ...markedDates[selectedDate],
                  selected: true, 
                  selectedColor: '#A259FF' 
                } 
              } : {})
            }}
            theme={{
              backgroundColor: '#ffffff',
              calendarBackground: '#ffffff',
              textSectionTitleColor: '#A259FF',
              selectedDayBackgroundColor: '#A259FF',
              selectedDayTextColor: '#ffffff',
              todayTextColor: '#A259FF',
              dayTextColor: '#000000',
              textDisabledColor: '#d9e1e8',
              arrowColor: '#A259FF',
              monthTextColor: '#A259FF',
              indicatorColor: '#A259FF',
              textDayFontWeight: '500',
              textMonthFontWeight: 'bold',
              textDayHeaderFontWeight: 'bold',
              textDayFontSize: 16,
              textMonthFontSize: 18,
              textDayHeaderFontSize: 14,
            }}
          />
          {selectedDate && (
            <>
              <Text style={styles.selectedDate}>Selected Date: {selectedDate}</Text>
              
              {/* Note Form */}
              <View style={styles.noteForm}>
                <Text style={styles.formTitle}>
                  {editingNote ? 'Edit Todo' : 'Add New Todo'}
                </Text>
                
                <TextInput
                  style={styles.input}
                  placeholder="Todo Title (optional)"
                  value={noteTitle}
                  onChangeText={setNoteTitle}
                />
                
                <TextInput
                  style={styles.noteInput}
                  placeholder="Enter your todo..."
                  value={note}
                  onChangeText={setNote}
                  multiline
                />
                
                <Text style={styles.priorityLabel}>Priority:</Text>
                <View style={styles.priorityButtons}>
                  {[1, 2, 3].map(priority => (
                    <TouchableOpacity
                      key={priority}
                      style={[
                        styles.priorityButton,
                        notePriority === priority && styles.activePriority
                      ]}
                      onPress={() => setNotePriority(priority)}
                    >
                      <Text style={[
                        styles.priorityButtonText,
                        notePriority === priority && styles.activePriorityText
                      ]}>
                        {priority === 1 ? 'Low' : priority === 2 ? 'Medium' : 'High'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                
                <View style={styles.formButtons}>
                  <TouchableOpacity 
                    style={[styles.saveNoteButton, loading && styles.disabledButton]} 
                    onPress={saveNote}
                    disabled={loading}
                  >
                    <Text style={styles.saveNoteText}>
                      {loading ? 'Saving...' : editingNote ? 'Update Todo' : 'Save Todo'}
                    </Text>
                  </TouchableOpacity>
                  
                  {editingNote && (
                    <TouchableOpacity 
                      style={styles.cancelButton} 
                      onPress={() => {
                        setEditingNote(null);
                        setNoteTitle('');
                        setNote('');
                        setNotePriority(1);
                      }}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Notes List */}
              {dateNotes.length > 0 && (
                <View style={styles.notesContainer}>
                  <Text style={styles.notesTitle}>Notes for {selectedDate}</Text>
                  {dateNotes.map(noteItem => (
                    <View key={noteItem.id} style={styles.noteItem}>
                      <View style={styles.noteContent}>
                        {noteItem.title && (
                          <Text style={styles.noteItemTitle}>{noteItem.title}</Text>
                        )}
                        <Text style={styles.noteItemText}>{noteItem.note}</Text>
                        <Text style={styles.noteItemDate}>
                          {new Date(noteItem.created_at).toLocaleTimeString()}
                        </Text>
                      </View>
                      <View style={styles.noteActions}>
                        <TouchableOpacity 
                          onPress={() => editNote(noteItem)}
                          style={styles.actionButton}
                        >
                          <Ionicons name="pencil" size={18} color="#A259FF" />
                        </TouchableOpacity>
                        <TouchableOpacity 
                          onPress={() => deleteNote(noteItem.id)}
                          style={styles.actionButton}
                        >
                          <Ionicons name="trash" size={18} color="#FF5252" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}
          <TouchableOpacity onPress={() => setCalendarVisible(false)} style={{ marginTop: 20 }}>
            <Text style={{ color: 'red', textAlign: 'center' }}>Close</Text>
          </TouchableOpacity>
        </ScrollView>
      </Modal>

      {/* Spacer */}
      <View style={styles.flexSpace} />

      {/* Bottom Nav */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate("Todo")}>
          <Ionicons name="list-outline" size={24} color="#5A189A" />
          <Text style={styles.navText}>To Do</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate("InProgress")}>
          <Ionicons name="time-outline" size={24} color="#5A189A" />
          <Text style={styles.navText}>In Progress</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate("Complete")}>
          <Ionicons name="checkmark-done-outline" size={24} color="#5A189A" />
          <Text style={styles.navText}>Complete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F4FB',
  },
  header: {
    flexDirection: 'row',
    backgroundColor: '#A259FF',
    paddingHorizontal: 16,
    paddingVertical: 20,
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    marginRight: 10,
  },
  username: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  calendarCard: {
    backgroundColor: '#A259FF',
    margin: 20,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  calendarIcon: {
    marginBottom: 10,
  },
  calendarText: {
    alignItems: 'center',
  },
  calendarTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  calendarSub: {
    color: '#fff',
    fontSize: 12,
  },
  editButton: {
    marginTop: 15,
    backgroundColor: '#D291FF',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  editText: {
    color: '#fff',
    fontWeight: '600',
  },
  flexSpace: {
    flex: 1,
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    backgroundColor: '#fff',
  },
  navItem: {
    alignItems: 'center',
  },
  navText: {
    color: '#5A189A',
    fontSize: 12,
    marginTop: 2,
  },
  modalContainer: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 50,
    backgroundColor: '#fff',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  selectedDate: {
    fontSize: 16,
    color: '#5A189A',
    marginTop: 10,
    marginHorizontal: 20,
    fontWeight: '600',
  },
  noteForm: {
    padding: 20,
    backgroundColor: '#f9f9f9',
    marginHorizontal: 20,
    borderRadius: 10,
    marginTop: 10,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#5A189A',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  noteInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    height: 100,
    textAlignVertical: 'top',
    backgroundColor: '#fff',
  },
  formButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  saveNoteButton: {
    flex: 1,
    backgroundColor: '#A259FF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveNoteText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.7,
  },
  priorityLabel: {
    fontSize: 16,
    marginBottom: 10,
    color: '#333',
    fontWeight: '600',
  },
  priorityButtons: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15,
  },
  priorityButton: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  activePriority: {
    backgroundColor: '#A259FF',
    borderColor: '#A259FF',
  },
  priorityButtonText: {
    color: '#666',
    fontWeight: '500',
  },
  activePriorityText: {
    color: '#fff',
  },
  notesContainer: {
    margin: 20,
  },
  notesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#5A189A',
  },
  noteItem: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  noteContent: {
    flex: 1,
    marginRight: 10,
  },
  noteItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
    color: '#333',
  },
  noteItemText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  noteItemDate: {
    fontSize: 12,
    color: '#999',
  },
  noteActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    padding: 5,
  },
});