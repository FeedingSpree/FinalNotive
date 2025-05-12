import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, SafeAreaView, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../utils/supabase';

const InProgressPage = ({ navigation }) => {
  const [tasks, setTasks] = useState([]);
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState('username');
  const [profilePic, setProfilePic] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (user) {
      loadTodos();
    }
  }, [user]);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        // Get username and profile from profiles table
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          setUsername(profile.username || 'username');
        }
      } else {
        navigation.navigate('Login');
      }
    } catch (error) {
      console.error('Error checking user:', error);
    }
  };

  const loadTodos = async () => {
    try {
      const { data, error } = await supabase
        .from('calendar_notes')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'in_progress')
        .order('date', { ascending: true })
        .order('priority', { ascending: false });

      if (error) throw error;

      // Transform data to match your UI
      const transformedTasks = data.map(item => ({
        id: item.id,
        title: item.title || item.note,
        color: getPriorityColor(item.priority),
        priority: item.priority,
        date: item.date,
        note: item.note
      }));

      setTasks(transformedTasks);
    } catch (error) {
      console.error('Error loading todos:', error);
      Alert.alert('Error', 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 3: return '#DC3545'; // High - Red
      case 2: return '#0D6EFD'; // Medium - Blue
      case 1: return '#198754'; // Low - Green
      default: return '#0D6EFD'; // Default - Blue
    }
  };

  const updateTaskStatus = async (taskId, newStatus) => {
    try {
      const updateData = {
        status: newStatus,
        updated_at: new Date().toISOString()
      };

      if (newStatus === 'complete') {
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('calendar_notes')
        .update(updateData)
        .eq('id', taskId);

      if (error) throw error;
      
      // Remove from current list
      setTasks(tasks.filter(task => task.id !== taskId));
      Alert.alert('Success', `Task moved to ${newStatus === 'complete' ? 'Complete' : 'To Do'}`);
    } catch (error) {
      console.error('Error updating task:', error);
      Alert.alert('Error', 'Failed to update task');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#A259FF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.profileSection}>
          <Image
            source={profilePic ? { uri: profilePic } : require('../assets/default.jpg')}
            style={styles.avatar}
          />
          <Text style={styles.username}>{username}</Text>
        </View>
      </View>

      <View style={styles.clockIconContainer}>
        <View style={styles.purpleCircle}>
          <Ionicons name="time-outline" size={40} color="#fff" />
        </View>
      </View>
    
      <View style={styles.tasksContainer}>
        <Text style={styles.sectionTitle}>In Progress:</Text>

        {tasks.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="time-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No tasks in progress</Text>
            <Text style={styles.emptySubtext}>Move some tasks here</Text>
          </View>
        ) : (
          <View style={styles.taskList}>
            {tasks.map((task) => (
              <View key={task.id} style={styles.taskItemWrapper}>
                <View style={styles.taskItem}>
                  <View style={[styles.taskBorder, { backgroundColor: task.color }]} />
                  <View style={styles.taskContent}>
                    <Text style={[styles.taskTitle, { color: task.color }]}>{task.title}</Text>
                    <Text style={styles.taskDate}>{task.date}</Text>
                  </View>
                  <View style={styles.actionButtons}>
                    <TouchableOpacity 
                      style={styles.backButton}
                      onPress={() => updateTaskStatus(task.id, 'todo')}
                    >
                      <Ionicons name="arrow-back" size={20} color="#999" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.completeButton, { backgroundColor: task.color }]}
                      onPress={() => updateTaskStatus(task.id, 'complete')}
                    >
                      <Text style={styles.completeText}>Complete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.blackShadowRight}></View>
                <View style={styles.blackShadowBottom}></View>
              </View>
            ))}
          </View>
        )}
      </View>

      <TouchableOpacity 
        style={styles.returnButton}
        onPress={() => navigation.navigate("Homepage")}>
        <Text style={styles.returnButtonText}>Return</Text>
      </TouchableOpacity>
      
      <View style={styles.flexSpace} />

      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate("Todo")}>
          <Ionicons name="list-outline" size={24} color="#A259FF"/>
          <Text style={styles.navText}>To Do</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.activeNavItem}>
          <Ionicons name="time-outline" size={24} color="#A259FF" />
          <Text style={[styles.navText, styles.activeNavText]}>In Progress</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate("Complete")}>
          <Ionicons name="checkmark-done-outline" size={24} color="#A259FF" />
          <Text style={styles.navText}>Complete</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F4FB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F7F4FB',
  },
  header: {
    backgroundColor: '#A259FF',
    paddingHorizontal: 16,
    paddingVertical: 20,
    alignItems: 'flex-start',
    borderBottomLeftRadius: 400,
    borderBottomRightRadius: 400,
    height: 165,
    marginLeft: -70,
    width: 370,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    marginLeft: 70,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  username: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '600',
    marginLeft: 15,
  },
  clockIconContainer: {
    position: 'absolute',
    right: 20,
    top: 130, 
    zIndex: 10, 
  },
  purpleCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#A259FF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
  },
  tasksContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    width: '90%',
    alignSelf: 'center',
    padding: 16,
    marginTop: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#A259FF', 
    marginBottom: 16,
    textShadowColor: 'rgba(162, 89, 255, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  taskList: {
    gap: 12,
  },
  taskItemWrapper: {
    position: 'relative',
    marginBottom: 15,
    paddingRight: 3,
    paddingBottom: 3,
  },
  taskItem: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 8,
    overflow: 'hidden',
    alignItems: 'center',
    height: 60,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    zIndex: 2,
  },
  blackShadowRight: {
    position: 'absolute',
    top: 3,
    bottom: 0,
    right: 0,
    width: 3,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderBottomRightRadius: 8,
    zIndex: 1,
  },
  blackShadowBottom: {
    position: 'absolute',
    bottom: 0,
    left: 3,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    zIndex: 1,
  },
  taskBorder: {
    width: 8,
    height: '100%',
  },
  taskContent: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  taskDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 5,
    marginRight: 10,
  },
  backButton: {
    padding: 8,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
  },
  completeButton: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  completeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
  },
  returnButton: {
    backgroundColor: '#A259FF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 30,
    width: '80%',
    alignItems: 'center',
    alignSelf: 'center',
  },
  returnButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
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
    paddingVertical: 6,
  },
  activeNavItem: {
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 2,
    borderBottomColor: '#A259FF',
  },
  navText: {
    color: '#A259FF',
    fontSize: 12,
    marginTop: 4,
  },
  activeNavText: {
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
    marginTop: 10,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#bbb',
    marginTop: 5,
  },
});

export default InProgressPage;