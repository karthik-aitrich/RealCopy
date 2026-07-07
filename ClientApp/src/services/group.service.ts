import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class GroupService {

  private baseUrl = 'http://localhost:5146/api/v1/group';

  constructor(private http: HttpClient) {}

  // ===============================
  // CREATE GROUP
  // ===============================
  createGroup(name: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/groups`, {
      name,
      creatorId: localStorage.getItem('userId')
    });
  }
     
//   addMember(groupId: string, us  erId: string) {
//   return this.http.post(
//     '/api/v1/group/add-member',
//     { groupId, userId }
//   );
// }

getAllUsers() {
  return this.http.get<any[]>('http://localhost:5146/api/v1/User/users');

}

  createGroupWithMembers(
    name: string,
    memberIds: string[]
  ): Observable<any> {
    return this.http.post<any>(
      `${this.baseUrl}/groups-with-members`,
      { name, memberIds }
    );
  }

  // ===============================
  // SIDEBAR
  // ===============================
  getMyGroups(): Observable<any[]> {
    const userId = localStorage.getItem('userId');
    return this.http.get<any[]>(
      `${this.baseUrl}/users/${userId}/groups`
      
    );
  }

  // ===============================
  // GROUP INFO (🔥 THIS IS THE KEY)
  // ===============================
  getGroupMembers(groupId: string): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.baseUrl}/${groupId}/members`
    );
  }

  // ===============================
  // MEMBER MANAGEMENT
  // ===============================
addMember(groupId: string, userId: string) {
  return this.http.post(
    `${this.baseUrl}/${groupId}/members`,
    { userId }
  );
}



  removeMember(groupId: string, userId: string): Observable<any> {
   return this.http.delete(
  `${this.baseUrl}/${groupId}/members/${userId}`
);
  }
deleteGroup(groupId: string) {
    console.log (groupId)
  return this.http.delete(
    `${this.baseUrl}/${groupId}`
  );
}
  changeRole(
    groupId: string,
    userId: string,
    role: number
  ): Observable<any> {
    return this.http.patch<any>(`${this.baseUrl}/${groupId}/members/${userId}?role=${role}`, {});
  }

  leaveGroup(groupId: string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/${groupId}/members/me`, 
       );
  }

  // ===============================
  // GROUP CHAT HISTORY
  // ===============================
  getGroupMessages(groupId: string): Observable<any[]> {
    return this.http.get<any[]>(
      `http://localhost:5146/api/v1/GroupChat/group/${groupId}`
    );
  }
}

