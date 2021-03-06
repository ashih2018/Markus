describe CourseSummariesController do

  context 'An admin' do
    before do
      @admin = Admin.create(user_name: 'adoe',
                            last_name: 'doe',
                            first_name: 'adam')
    end

    describe '#download_csv_grades_report' do
      before :each do
        3.times { create(:assignment_with_criteria_and_results) }
      end

      it 'be able to get a csv grade report' do
        csv_rows = get_as(@admin, :download_csv_grades_report, format: :csv).parsed_body
        expect(csv_rows.size).to eq(Student.count + 1) # one header row plus one row per student

        assignments = Assignment.all
        header = [User.human_attribute_name(:user_name),
                  User.human_attribute_name(:first_name),
                  User.human_attribute_name(:last_name),
                  User.human_attribute_name(:id_number)]
        assignments.each do |assignment|
          header.push(assignment.short_identifier)
        end
        expect(csv_rows.shift).to eq(header)
        csv_rows.each do |csv_row|
          student_name = csv_row.shift
          # Skipping first/last name and id_number fields
          3.times { |_| csv_row.shift }
          student = Student.find_by_user_name(student_name)
          expect(student).to be_truthy
          expect(assignments.size).to eq(csv_row.size)

          csv_row.each_with_index do |final_mark, index|
            if final_mark.blank?
              if student.has_accepted_grouping_for?(assignments[index])
                grouping = student.accepted_grouping_for(assignments[index])
                expect(!grouping.has_submission? ||
                  assignments[index].max_mark == 0).to be_truthy
              end
            else
              out_of = assignments[index].max_mark
              grouping = student.accepted_grouping_for(assignments[index])
              expect(final_mark.to_f.round).to eq((grouping.current_result.total_mark / out_of *
                100).to_f.round)
            end
          end
        end
        expect(response.status).to eq(200)
      end
    end

    describe '#populate' do
      before :each do
        3.times { create(:assignment_with_criteria_and_results) }
        2.times { create(:grade_entry_form_with_data) }
        # TODO: Create marking scheme as well

        get_as @admin, :populate, format: :json
        response_data = response.parsed_body.deep_symbolize_keys
        @columns = response_data[:columns]
        @data = response_data[:data]
      end

      it 'returns the correct columns' do
        expect(@columns.length).to eq(Assignment.count + GradeEntryForm.count)
        Assignment.find_each do |a|
          expected = {
            accessor: "assignment_marks.#{a.id}",
            Header: a.short_identifier,
            minWidth: 50,
            className: 'number'
          }
          expect(@columns).to include expected
        end
        GradeEntryForm.find_each do |gef|
          expected = {
            accessor: "grade_entry_form_marks.#{gef.id}",
            Header: gef.short_identifier,
            minWidth: 50,
            className: 'number'
          }
          expect(@columns).to include expected
        end
      end

      it 'returns the correct grades' do
        expect(@data.length).to eq Student.count
        Student.find_each do |student|
          expected = {
            id: student.id,
            id_number: student.id_number,
            user_name: student.user_name,
            first_name: student.first_name,
            last_name: student.last_name,
            hidden: student.hidden,
            assignment_marks: {},
            grade_entry_form_marks: Hash[GradeEntryForm.all.map do |ges|
              [ges.id.to_s.to_sym, ges.grade_entry_students.find_by(user: student).total_grade]
            end
            ]
          }
          student.accepted_groupings.each do |g|
            expected[:assignment_marks][g.assessment_id.to_s.to_sym] = g.current_result.total_mark
          end
          expect(@data).to include expected
        end
      end
    end
  end

  context 'A grader' do
    before do
      @grader = Ta.create(user_name: 'adoe',
                          last_name: 'doe',
                          first_name: 'adam')
    end

    it 'not be able to CSV graders report' do
      get_as @grader, :download_csv_grades_report
      expect(response.status).to eq(404)
    end
  end

  context 'A student' do
    before do
      @student = Student.create(user_name: 'adoe',
                                last_name: 'doe',
                                first_name: 'adam')
    end

    it 'not be able to access grades report' do
      get_as @student, :download_csv_grades_report
      expect(response.status).to eq(404)
    end

    describe '#populate' do
      context 'when no marks are released' do
        before :each do
          3.times { create(:assignment_with_criteria_and_results) }
          2.times { create(:grade_entry_form_with_data) }
          # TODO: Create marking scheme as well

          @student2 = Student.first
          get_as @student2, :populate, format: :json
          response_data = response.parsed_body.deep_symbolize_keys
          @columns = response_data[:columns]
          @data = response_data[:data]
        end

        it 'returns the correct columns' do
          expect(@columns.length).to eq(Assignment.count + GradeEntryForm.count)
          Assignment.find_each do |a|
            expected = {
              accessor: "assignment_marks.#{a.id}",
              Header: a.short_identifier,
              minWidth: 50,
              className: 'number'
            }
            expect(@columns).to include expected
          end
          GradeEntryForm.find_each do |gef|
            expected = {
              accessor: "grade_entry_form_marks.#{gef.id}",
              Header: gef.short_identifier,
              minWidth: 50,
              className: 'number'
            }
            expect(@columns).to include expected
          end
        end

        it 'returns no grades for the student' do
          expect(@data.length).to eq 1
          expected = {
            id: @student2.id,
            id_number: @student2.id_number,
            user_name: @student2.user_name,
            first_name: @student2.first_name,
            last_name: @student2.last_name,
            hidden: @student2.hidden,
            assignment_marks: {},
            grade_entry_form_marks: {}
          }
          expect(@data).to include expected
        end
      end
    end
  end
end
