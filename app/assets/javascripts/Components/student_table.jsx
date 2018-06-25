import React from 'react';
import {render} from 'react-dom';

import {CheckboxTable, withSelection} from './markus_with_selection_hoc'


class RawStudentTable extends React.Component {
  constructor() {
    super();
    this.state = {
      data: {students: [], sections: {}},
      loading: true,
    };
  }

  componentDidMount() {
    this.fetchData();
  }

  fetchData = () => {
    $.ajax({
      method: 'get',
      url: Routes.students_path(),
      dataType: 'json',
    }).then(res => {
      this.setState({
        data: res,
        loading: false,
        selection: [],
        selectAll: false,
      });
    });
  };

  /* Called when an action is run */
  onSubmit = (event) => {
    event.preventDefault();

    const data = {
      student_ids: this.props.selection,
      bulk_action: this.actionBox.state.action,
      grace_credits: this.actionBox.state.grace_credits,
      section: this.actionBox.state.section
    };

    this.setState({loading: true});
    $.ajax({
      method: 'patch',
      url: Routes.bulk_modify_students_path(),
      data: data
    }).then(this.fetchData);
  };

  render() {
    const {data, loading} = this.state;

    return (
      <div>
        <StudentsActionBox
          ref={(r) => this.actionBox = r}
          sections={data.sections}
          disabled={this.props.selection.length === 0}
          onSubmit={this.onSubmit}
        />
        <CheckboxTable
          ref={(r) => this.checkboxTable = r}

          data={data.students}
          columns={[
            {
              Header: I18n.t('activerecord.attributes.user.user_name'),
              accessor: 'user_name',
              id: 'user_name',
              minWidth: 120
            },
            {
              Header: I18n.t('activerecord.attributes.user.first_name'),
              accessor: 'first_name',
              minWidth: 120
            },
            {
              Header: I18n.t('activerecord.attributes.user.last_name'),
              accessor: 'last_name',
              minWidth: 120
            },
            {
              Header: I18n.t('activerecord.attributes.user.email'),
              accessor: 'email',
              minWidth: 150
            },
            {
              Header: I18n.t('activerecord.attributes.user.id_number'),
              accessor: 'id_number',
              minWidth: 90
            },
            {
              Header: I18n.t('activerecord.models.section', {count: 1}),
              accessor: 'section',
              id: 'section',
              Cell: ({ value }) => {
                return data.sections[value] || ''
              },
              show: Boolean(data.sections),
              filterMethod: (filter, row) => {
                if (filter.value === 'all') {
                  return true;
                } else {
                  return data.sections[row[filter.id]] === filter.value;
                }
              },
              Filter: ({ filter, onChange }) =>
                <select
                  onChange={event => onChange(event.target.value)}
                  style={{ width: '100%' }}
                  value={filter ? filter.value : 'all'}
                >
                  <option value='all'>{I18n.t('all')}</option>
                  {Object.entries(data.sections).map(
                    kv => <option key={kv[1]} value={kv[1]}>{kv[1]}</option>)}
                </select>,
            },
            {
              Header: I18n.t('activerecord.attributes.user.grace_credits'),
              id: 'grace_credits',
              Cell: row => `${row.original.remaining_grace_credits} / ${row.original.grace_credits}`,
              minWidth: 90
            },
            {
              Header: I18n.t('active') + '?',
              accessor: 'hidden',
              Cell: ({ value }) => value ? I18n.t('not_active') : I18n.t('active'),
              filterMethod: (filter, row) => {
                if (filter.value === 'all') {
                  return true;
                } else {
                  return (
                    (filter.value === 'active' && !row[filter.id]) ||
                    (filter.value === 'inactive' && row[filter.id])
                  );
                }
              },
              Filter: ({ filter, onChange }) =>
                <select
                  onChange={event => onChange(event.target.value)}
                  style={{ width: '100%' }}
                  value={filter ? filter.value : 'all'}
                >
                  <option value='all'>{I18n.t('all')}</option>
                  <option value='active'>{I18n.t('active')}</option>
                  <option value='inactive'>{I18n.t('not_active')}</option>
                </select>,
            },
            {
              Header: I18n.t('actions'),
              accessor: '_id',
              Cell: data => (
                <span>
                  <a href={Routes.edit_student_path(data.value)}>
                    {I18n.t('edit')}
                  </a>&nbsp;
                </span>
              ),
              sortable: false,
              filterable: false,
            }
          ]}
          defaultSorted={[
            {
              id: 'user_name'
            }
          ]}
          filterable
          loading={loading}

          {...this.props.getCheckboxProps()}
        />
      </div>
    );
  }
}


class StudentsActionBox extends React.Component {
  constructor() {
    super();
    this.state = {
      action: 'give_grace_credits',
      grace_credits: 0,
      selected_section: '',
      button_disabled: false
    };
  }

  inputChanged = (event) => {
    this.setState({[event.target.name]: event.target.value});
  };

  actionChanged = (event) => {
    this.setState({action: event.target.value});
  };

  render = () => {
    let optionalInputBox = null;
    if (this.state.action === 'give_grace_credits') {
      optionalInputBox =
        <input type='number'
               name='grace_credits'
               value={this.state.grace_credits}
               onChange={this.inputChanged} />;
    } else if (this.state.action === 'update_section') {
      if (Object.keys(this.props.sections).length > 0) {
        const section_options = Object.entries(this.props.sections).map(
          section => <option key={section[0]} value={section[0]}>{section[1]}</option>
        );
        optionalInputBox =
          <select name='section'
                  value={this.state.section}
                  onChange={this.inputChanged}>
            <option value=''></option>
            {section_options}
          </select>
      }
      else {
        optionalInputBox =
          <span>
            {I18n.t('sections.none')}
          </span>;
      }
    }

    return (
      <form onSubmit={this.props.onSubmit}>
        <select value={this.state.action} onChange={this.actionChanged}>
          <option value='give_grace_credits'>{I18n.t('students.admin_actions.give_grace_credits')}</option>
          <option value='update_section'>{I18n.t('students.admin_actions.add_section')}</option>
          <option value='hide'>{I18n.t('students.admin_actions.mark_inactive')}</option>
          <option value='unhide'>{I18n.t('students.admin_actions.mark_active')}</option>
        </select>
        {optionalInputBox}
        <input type='submit'
               disabled={this.props.disabled}
               value={I18n.t('apply')}>
        </input>
      </form>
    );
  };
}


let StudentTable = withSelection(RawStudentTable);


export function makeStudentTable(elem) {
  render(<StudentTable />, elem);
}
