import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, SafeAreaView, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../utils/supabase';

const CompletePage = ({ navigation }) => {
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
        .eq('status', 'complete')
        .order('completed_at', { ascending: false });

      if (error) throw error;

      // Transform data to match your UI
      const transformedTasks = data.map(item => ({
        id: item.id,
        title: item.title || item.note,
        color: getPriorityColor(item.priority),
        priority: item.priority,
        date: item.date,
        note: item.note,
        completedAt: item.completed_at
      }));

      setTasks(transformedTasks);
    } catch (error) {
      console.error('Error loading todos:', error);
      Alert.alert('Error', 'Failed to load completed tasks');
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
        updated_at: new Date().toISOString(),
        completed_at: null
      };

      const { error } = await supabase
        .from('calendar_notes')
        .update(updateData)
        .eq('id', taskId);

      if (error) throw error;
      
      // Remove from current list
      setTasks(tasks.filter(task => task.id !== taskId));
      Alert.alert('Success', `Task moved back to ${newStatus === 'todo' ? 'To Do' : 'In Progress'}`);
    } catch (error) {
      console.error('Error updating task:', error);
      Alert.alert('Error', 'Failed to update task');
    }
  };

  const deleteTask = async (taskId) => {
    Alert.alert(
      'Delete Completed Task',
      'Are you sure you want to delete this task?',
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
                .eq('id', taskId);

              if (error) throw error;
              
              setTasks(tasks.filter(task => task.id !== taskId));
              Alert.alert('Success', 'Task deleted successfully');
            } catch (error) {
              console.error('Error deleting task:', error);
              Alert.alert('Error', 'Failed to delete task');
            }
          }
        }
      ]
    );
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

      <View style={styles.checkIconContainer}>
        <View style={styles.greenCircle}>
          <Ionicons name="checkmark-done" size={40} color="#fff" />
        </View>
      </View>
    
      <View style={styles.tasksContainer}>
        <Text style={styles.sectionTitle}>Completed:</Text>

        {tasks.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-done-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No completed tasks</Text>
            <Text style={styles.emptySubtext}>Complete some tasks to see them here</Text>
          </View>
        ) : (
          <View style={styles.taskList}>
            {tasks.map((task) => (
              <View key={task.id} style={styles.taskItemWrapper}>
                <View style={styles.taskItem}>
                  <View style={[styles.taskBorder, { backgroundColor: '#198754' }]} />
                  <View style={styles.taskContent}>
                    <Text style={[styles.taskTitle, styles.completedText]}>{task.title}</Text>
                    <Text style={styles.taskDate}>
                      Completed: {new Date(task.completedAt).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={styles.actionButtons}>
                    <TouchableOpacity 
                      style={styles.restoreButton}
                      onPress={() => updateTaskStatus(task.id, 'in_progress')}
                    >
                      <Ionicons name="refresh" size={20} color="#FF9800" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.deleteButton}
                      onPress={() => deleteTask(task.id)}
                    >
                      <Ionicons name="trash" size={20} color="#FF5252" />
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
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate("InProgress")}>
          <Ionicons name="time-outline" size={24} color="#A259FF" />
          <Text style={styles.navText}>In Progress</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.activeNavItem}>
          <Ionicons name="checkmark-done-outline" size={24} color="#A259FF" />
          <Text style={[styles.navText, styles.activeNavText]}>Complete</Text>
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
  checkIconContainer: {
    position: 'absolute',
    right: 20,
    top: 130, 
    zIndex: 10, 
  },
  greenCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#198754',
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
    color: '#198754', 
    marginBottom: 16,
    textShadowColor: 'rgba(25, 135, 84, 0.2)',
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
    color: '#198754',
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: '#999',
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
  restoreButton: {
    padding: 8,
    borderRadius: 16,
    backgroundColor: '#fff8e1',
  },
  deleteButton: {
    padding: 8,
    borderRadius: 16,
    backgroundColor: '#ffebee',
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

export default CompletePage;